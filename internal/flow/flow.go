package flow

import (
	"context"
	cryptorand "crypto/rand"
	"crypto/hmac"
	"crypto/md5"
	"crypto/sha1"
	"crypto/sha256"
	"crypto/sha512"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"hash"
	"io"
	"math/rand"
	"net/url"
	"regexp"
	"regexp/syntax"
	"strconv"
	"strings"
	"sync"
	"time"

	"bytes"
	"os/exec"
	"runtime"

	"golang.org/x/text/encoding/charmap"
	"golang.org/x/text/encoding/japanese"
	"golang.org/x/text/encoding/simplifiedchinese"
	"golang.org/x/text/encoding/unicode"
	"golang.org/x/text/transform"

	fhttp "github.com/bogdanfinn/fhttp"
	tls_client "github.com/bogdanfinn/tls-client"
	"github.com/PuerkitoBio/goquery"

	"axiom/internal/job"
)


var nestedQuantifierRe = regexp.MustCompile(`\([^)]*[+*][^)]*\)[+*?]`)

func safeCompile(pattern string) (*regexp.Regexp, error) {
	if _, err := syntax.Parse(pattern, syntax.Perl); err != nil {
		return nil, err
	}
	if nestedQuantifierRe.MatchString(pattern) {
		return nil, fmt.Errorf("regex pattern contains nested quantifiers (ReDoS risk)")
	}
	return regexp.Compile(pattern)
}

var regexCache sync.Map

func cachedCompile(pattern string) (*regexp.Regexp, error) {
	if v, ok := regexCache.Load(pattern); ok {
		return v.(*regexp.Regexp), nil
	}
	re, err := safeCompile(pattern)
	if err != nil {
		return nil, err
	}
	actual, _ := regexCache.LoadOrStore(pattern, re)
	return actual.(*regexp.Regexp), nil
}

var flowBodyPool = sync.Pool{
	New: func() interface{} {
		buf := make([]byte, maxFlowBody)
		return &buf
	},
}


type Graph struct {
	Nodes      []Node `json:"nodes"`
	Edges      []Edge `json:"edges"`
	nodeByID   map[string]*Node
	adjBySrc   map[string][]Edge
	entryNodes []string
}

func (g *Graph) Init() {
	g.nodeByID = make(map[string]*Node, len(g.Nodes))
	for i := range g.Nodes {
		g.nodeByID[g.Nodes[i].ID] = &g.Nodes[i]
	}
	g.adjBySrc = make(map[string][]Edge, len(g.Nodes))
	hasIncoming := make(map[string]bool, len(g.Edges))
	for _, e := range g.Edges {
		g.adjBySrc[e.Source] = append(g.adjBySrc[e.Source], e)
		hasIncoming[e.Target] = true
	}
	for _, n := range g.Nodes {
		if n.Type != "comment" && !hasIncoming[n.ID] {
			g.entryNodes = append(g.entryNodes, n.ID)
		}
	}
}

type Node struct {
	ID   string          `json:"id"`
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

type Edge struct {
	Source       string `json:"source"`
	Target       string `json:"target"`
	SourceHandle string `json:"sourceHandle,omitempty"`
}

func (g *Graph) byID(id string) *Node {
	return g.nodeByID[id]
}

const noMatchHandle = "\x00no_match"

func (g *Graph) next(src, handle string) []string {
	var out []string
	for _, e := range g.adjBySrc[src] {
		if handle == "" || e.SourceHandle == handle {
			out = append(out, e.Target)
		}
	}
	return out
}


type vars map[string]string

var varRe = regexp.MustCompile(`\{\{([^}]+)\}\}`)

func (v vars) interp(s string) string {
	if !strings.Contains(s, "{{") {
		return s
	}
	if len(s) > 4 && s[0] == '{' && s[1] == '{' && s[len(s)-1] == '}' && s[len(s)-2] == '}' {
		inner := s[2 : len(s)-2]
		if !strings.Contains(inner, "{{") {
			name := strings.TrimSpace(inner)
			if val, ok := v[name]; ok {
				return val
			}
			return s
		}
	}
	return varRe.ReplaceAllStringFunc(s, func(m string) string {
		name := strings.TrimSpace(m[2 : len(m)-2])
		if val, ok := v[name]; ok {
			return val
		}
		return m
	})
}

func (v vars) inputOrBody(raw string) string {
	s := v.interp(raw)
	if s == "" {
		return v["body"]
	}
	return s
}

func (v vars) set(name, value string) {
	if name != "" {
		v[name] = value
	}
}


type baseOut struct {
	varName string
	capture bool
}

func parseBase(data json.RawMessage) baseOut {
	var d struct {
		VarName string `json:"varName"`
		Capture *bool  `json:"capture"`
	}
	_ = json.Unmarshal(data, &d)
	cap := true
	if d.Capture != nil {
		cap = *d.Capture
	}
	return baseOut{varName: d.VarName, capture: cap}
}

func field(label, value string) job.LogField          { return job.LogField{Label: label, Value: value} }
func fieldExp(label, value string) job.LogField        { return job.LogField{Label: label, Value: value, Expandable: true} }
func errStep(nodeType, lbl, msg string) job.LogStep    { return job.LogStep{NodeType: nodeType, NodeLabel: lbl, Error: msg} }


type Result struct {
	StatusCode   int
	BodySnippet  string
	LogSteps     []job.LogStep
	CapturedVars []job.CapturedVar
	OutputBranch string
	Error        string
}


const maxFlowBody = 1 << 20

func Run(ctx context.Context, client tls_client.HttpClient, g *Graph, initVars map[string]string) Result {
	if g == nil {
		return Result{Error: "nil graph"}
	}
	vv := vars{}
	for k, v := range initVars {
		vv.set(k, v)
	}
	var steps []job.LogStep
	var allVarOrder []string
	allVarCapture := map[string]bool{}
	var outputBranch string
	var lastStatus int
	var lastBody string

	visited := make(map[string]bool, len(g.Nodes))
	queue := make([]string, len(g.entryNodes))
	copy(queue, g.entryNodes)

	for len(queue) > 0 {
		id := queue[0]
		queue = queue[1:]
		if visited[id] {
			continue
		}
		visited[id] = true

		node := g.byID(id)
		if node == nil {
			continue
		}

		var step job.LogStep
		nextHandle := ""

		switch node.Type {
		case "http_request":
			step = execHTTP(ctx, client, node, vv)
			if step.Error == "" {
				lastStatus, _ = strconv.Atoi(vv["status"])
				lastBody = vv["body"]
			}

		case "regex_extract":
			step = execRegex(node, vv)
		case "html_select":
			step = execHTMLSelect(node, vv)
		case "parse":
			step = execParse(node, vv)
		case "json_extract":
			step = execJSONExtract(node, vv)
		case "set_variable":
			step = execSetVar(node, vv)
		case "random_data":
			step = execRandom(node, vv)
		case "string_op":
			step = execStringOp(node, vv)
		case "encode_decode":
			step = execEncodeDecode(node, vv)
		case "hash":
			step = execHash(node, vv)
		case "condition", "output":
			var branchLabel string
			step, branchLabel, nextHandle = execCondition(node, vv, lastStatus, lastBody)
			outputBranch = branchLabel
		case "if":
			step, _, nextHandle = execCondition(node, vv, lastStatus, lastBody)
		case "wait":
			step = execWait(ctx, node)
		case "terminal":
			step = execTerminal(ctx, node, vv)
		case "comment":
			continue
		default:
			step = errStep(node.Type, label(node), "node type not yet supported")
		}

		b := parseBase(node.Data)
		if b.varName != "" && vv[b.varName] != "" {
			if _, exists := allVarCapture[b.varName]; !exists {
				allVarOrder = append(allVarOrder, b.varName)
				allVarCapture[b.varName] = b.capture
			} else if b.capture {
				allVarCapture[b.varName] = true
			}
		}

		if step.NodeType != "" {
			steps = append(steps, step)
		}

		if nextHandle == noMatchHandle {
			continue
		}
		for _, nxt := range g.next(id, nextHandle) {
			if !visited[nxt] {
				queue = append(queue, nxt)
			}
		}
	}

	captured := make([]job.CapturedVar, 0, len(allVarOrder))
	for _, name := range allVarOrder {
		captured = append(captured, job.CapturedVar{
			Name:   name,
			Value:  vv[name],
			Hidden: !allVarCapture[name],
		})
	}

	return Result{
		StatusCode:   lastStatus,
		BodySnippet:  lastBody,
		LogSteps:     steps,
		CapturedVars: captured,
		OutputBranch: outputBranch,
	}
}

func label(n *Node) string {
	var d struct{ Label string `json:"label"` }
	_ = json.Unmarshal(n.Data, &d)
	if d.Label != "" {
		return d.Label
	}
	return n.Type
}


func rIntn(n int) int   { return rand.Intn(n) }
func rFloat64() float64 { return rand.Float64() }


func execHTTP(ctx context.Context, client tls_client.HttpClient, node *Node, vv vars) job.LogStep {
	var d struct {
		Label          string `json:"label"`
		Method         string `json:"method"`
		URL            string `json:"url"`
		Headers        string `json:"headers"`
		Cookies        string `json:"cookies"`
		Body           string `json:"body"`
		UserAgent      string `json:"userAgent"`
		BasicAuthUser  string `json:"basicAuthUser"`
		BasicAuthPass  string `json:"basicAuthPass"`
		RequestType    string `json:"requestType"`
		ContentType    string `json:"contentType"`
		EncodeContent  bool   `json:"encodeContent"`
		VarName        string `json:"varName"`
		Capture        *bool  `json:"capture"`
		StatusVarName  string `json:"statusVarName"`
		HeaderVarName  string `json:"headerVarName"`
		HeaderName     string `json:"headerName"`
	}
	_ = json.Unmarshal(node.Data, &d)

	method := vv.interp(d.Method)
	if method == "" {
		method = "GET"
	}
	rawURL := vv.interp(d.URL)
	reqBody := vv.interp(d.Body)
	if d.EncodeContent && reqBody != "" {
		reqBody = url.QueryEscape(reqBody)
	}

	var bodyReader io.Reader
	if reqBody != "" {
		bodyReader = strings.NewReader(reqBody)
	}

	nodeLabel := d.Label
	if nodeLabel == "" {
		nodeLabel = "HTTP Request"
	}

	req, err := fhttp.NewRequest(method, rawURL, bodyReader)
	if err != nil {
		s := errStep("http_request", nodeLabel, err.Error())
		s.Fields = []job.LogField{field("url", rawURL)}
		return s
	}
	req = req.WithContext(ctx)

	for _, line := range strings.Split(vv.interp(d.Headers), "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		if i := strings.IndexByte(line, ':'); i > 0 {
			req.Header.Set(strings.TrimSpace(line[:i]), strings.TrimSpace(line[i+1:]))
		}
	}
	if c := strings.TrimSpace(vv.interp(d.Cookies)); c != "" {
		req.Header.Set("Cookie", c)
	}
	if ua := strings.TrimSpace(vv.interp(d.UserAgent)); ua != "" {
		req.Header.Set("User-Agent", ua)
	}
	if ct := strings.TrimSpace(d.ContentType); ct != "" && reqBody != "" {
		req.Header.Set("Content-Type", ct)
	}
	if d.RequestType == "basicauth" {
		req.SetBasicAuth(vv.interp(d.BasicAuthUser), vv.interp(d.BasicAuthPass))
	}

	start := time.Now()
	resp, err := client.Do(req)
	latMs := float64(time.Since(start)) / 1e6
	latStr := fmt.Sprintf("%.0fms", latMs)

	if err != nil {
		s := errStep("http_request", nodeLabel, err.Error())
		s.Fields = []job.LogField{field("url", rawURL), field("latency", latStr)}
		s.DurationMs = &latMs
		return s
	}
	defer resp.Body.Close()

	bufPtr := flowBodyPool.Get().(*[]byte)
	n, _ := io.ReadFull(resp.Body, *bufPtr)
	_, _ = io.Copy(io.Discard, resp.Body)
	respBody := string((*bufPtr)[:n])
	flowBodyPool.Put(bufPtr)
	statusCodeStr := strconv.Itoa(resp.StatusCode)

	rsHeaders := make(map[string]string, len(resp.Header))
	for k, vals := range resp.Header {
		rsHeaders[strings.ToLower(k)] = strings.Join(vals, ", ")
	}
	rsHeaderJSON, _ := json.Marshal(rsHeaders)
	cookieHdr := resp.Header.Get("Set-Cookie")

	vv.set("body", respBody)
	vv.set("status", statusCodeStr)
	vv.set("status_code", statusCodeStr)
	for k, v := range rsHeaders {
		vv.set("header_"+strings.ReplaceAll(k, "-", "_"), v)
	}

	vv.set(nodeLabel+": Body", respBody)
	vv.set(nodeLabel+": Status", statusCodeStr)
	vv.set(nodeLabel+": RSHeader", string(rsHeaderJSON))
	vv.set(nodeLabel+": Cookie", cookieHdr)

	if d.VarName != "" {
		vv.set(d.VarName, respBody)
	}
	if d.StatusVarName != "" {
		vv.set(d.StatusVarName, statusCodeStr)
	}
	if d.HeaderVarName != "" && d.HeaderName != "" {
		vv.set(d.HeaderVarName, rsHeaders[strings.ToLower(d.HeaderName)])
	}

	statusStr := fmt.Sprintf("%d %s", resp.StatusCode, httpStatusText(resp.StatusCode))
	fields := []job.LogField{
		field("url", rawURL),
		field("status", statusStr),
		field("latency", latStr),
	}
	if respBody != "" {
		fields = append(fields, fieldExp("response body", respBody))
	}

	return job.LogStep{
		NodeType:   "http_request",
		NodeLabel:  nodeLabel,
		Fields:     fields,
		DurationMs: &latMs,
	}
}

var httpStatusTexts = map[int]string{
	200: "OK", 201: "Created", 204: "No Content",
	301: "Moved Permanently", 302: "Found", 303: "See Other",
	304: "Not Modified", 307: "Temporary Redirect", 308: "Permanent Redirect",
	400: "Bad Request", 401: "Unauthorized", 403: "Forbidden",
	404: "Not Found", 405: "Method Not Allowed", 409: "Conflict",
	422: "Unprocessable Entity", 429: "Too Many Requests",
	500: "Internal Server Error", 502: "Bad Gateway", 503: "Service Unavailable",
}

func httpStatusText(code int) string {
	return httpStatusTexts[code]
}


func execRegex(node *Node, vv vars) job.LogStep {
	var d struct {
		Label           string `json:"label"`
		Input           string `json:"input"`
		Pattern         string `json:"pattern"`
		Group           int    `json:"group"`
		Multiline       bool   `json:"multiline"`
		CaseInsensitive bool   `json:"caseInsensitive"`
		AllMatches      bool   `json:"allMatches"`
		VarName         string `json:"varName"`
		EncodeOutput    bool   `json:"encodeOutput"`
	}
	_ = json.Unmarshal(node.Data, &d)

	lbl := d.Label; if lbl == "" { lbl = "Regex Extract" }

	if d.Group < 0 {
		return errStep("regex_extract", lbl, "group index must be >= 0")
	}

	input := vv.inputOrBody(d.Input)
	pattern := d.Pattern
	if d.CaseInsensitive {
		pattern = "(?i)" + pattern
	}
	if d.Multiline {
		pattern = "(?m)" + pattern
	}

	re, err := cachedCompile(pattern)
	if err != nil {
		return errStep("regex_extract", lbl, "invalid pattern: "+err.Error())
	}

	var result string
	if d.AllMatches {
		matches := re.FindAllStringSubmatch(input, -1)
		var parts []string
		for _, m := range matches {
			if d.Group < len(m) {
				parts = append(parts, m[d.Group])
			}
		}
		result = strings.Join(parts, "\n")
	} else {
		m := re.FindStringSubmatch(input)
		if d.Group < len(m) {
			result = m[d.Group]
		}
	}

	if d.EncodeOutput && result != "" {
		result = base64.StdEncoding.EncodeToString([]byte(result))
	}
	vv.set(d.VarName, result)

	return job.LogStep{
		NodeType:  "regex_extract",
		NodeLabel: lbl,
		Fields:    []job.LogField{field("pattern", d.Pattern), field("match", result)},
	}
}


func execHTMLSelect(node *Node, vv vars) job.LogStep {
	var d struct {
		Label      string `json:"label"`
		Input      string `json:"input"`
		Selector   string `json:"selector"`
		Attribute  string `json:"attribute"`
		Index      int    `json:"index"`
		AllMatches bool   `json:"allMatches"`
		VarName    string `json:"varName"`
	}
	_ = json.Unmarshal(node.Data, &d)

	lbl := d.Label; if lbl == "" { lbl = "HTML Select" }
	input := vv.inputOrBody(d.Input)
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(input))
	if err != nil {
		return errStep("html_select", lbl, "parse error: "+err.Error())
	}

	sel := doc.Find(d.Selector)
	if sel.Length() == 0 {
		return errStep("html_select", lbl, fmt.Sprintf("no elements for selector %q", d.Selector))
	}

	extractAttr := func(el *goquery.Selection) string {
		switch d.Attribute {
		case "", "text":
			return strings.TrimSpace(el.Text())
		case "html":
			h, _ := el.Html()
			return h
		default:
			v, _ := el.Attr(d.Attribute)
			return v
		}
	}

	var result string
	if d.AllMatches {
		var parts []string
		sel.Each(func(_ int, el *goquery.Selection) {
			parts = append(parts, extractAttr(el))
		})
		b, _ := json.Marshal(parts)
		result = string(b)
	} else {
		el := sel.Eq(d.Index)
		if el.Length() == 0 {
			return errStep("html_select", lbl, fmt.Sprintf("no element at index %d", d.Index))
		}
		result = extractAttr(el)
	}

	vv.set(d.VarName, result)
	return job.LogStep{
		NodeType:  "html_select",
		NodeLabel: lbl,
		Fields:    []job.LogField{field("selector", d.Selector), field("value", result)},
	}
}


func execParse(node *Node, vv vars) job.LogStep {
	var d struct {
		Label      string `json:"label"`
		Input      string `json:"input"`
		ParseType  string `json:"parseType"`
		StartStr   string `json:"startStr"`
		EndStr     string `json:"endStr"`
		Occurrence string `json:"occurrence"`
		JSONKey    string `json:"jsonKey"`
		VarName    string `json:"varName"`
	}
	_ = json.Unmarshal(node.Data, &d)

	lbl := d.Label; if lbl == "" { lbl = "Parse" }
	input := vv.inputOrBody(d.Input)
	var result string

	switch d.ParseType {
	case "json":
		var obj interface{}
		if err := json.Unmarshal([]byte(input), &obj); err != nil {
			return errStep("parse", lbl, "JSON parse error: "+err.Error())
		}
		result = jsonDotPath(obj, d.JSONKey)
	default:
		result = parseBetween(input, d.StartStr, d.EndStr, d.Occurrence)
	}

	vv.set(d.VarName, result)

	fields := []job.LogField{field("result", result)}
	if input != "" {
		fields = append(fields, fieldExp("reference source", input))
	}
	return job.LogStep{NodeType: "parse", NodeLabel: lbl, Fields: fields}
}

func parseBetween(input, start, end, occurrence string) string {
	switch occurrence {
	case "last":
		i := strings.LastIndex(input, start)
		if i < 0 {
			return ""
		}
		i += len(start)
		j := strings.LastIndex(input[i:], end)
		if j < 0 {
			return ""
		}
		return input[i : i+j]
	case "all":
		var parts []string
		s := input
		for {
			i := strings.Index(s, start)
			if i < 0 {
				break
			}
			s = s[i+len(start):]
			j := strings.Index(s, end)
			if j < 0 {
				break
			}
			parts = append(parts, s[:j])
			s = s[j+len(end):]
		}
		return strings.Join(parts, "\n")
	default:
		i := strings.Index(input, start)
		if i < 0 {
			return ""
		}
		i += len(start)
		j := strings.Index(input[i:], end)
		if j < 0 {
			return ""
		}
		return input[i : i+j]
	}
}

func jsonDotPath(obj interface{}, path string) string {
	if path == "" {
		b, _ := json.Marshal(obj)
		return string(b)
	}
	tokens := tokenizePath(path)
	cur := obj
	for _, t := range tokens {
		if cur == nil {
			return ""
		}
		if idx, err := strconv.Atoi(t); err == nil {
			switch v := cur.(type) {
			case []interface{}:
				if idx < 0 || idx >= len(v) {
					return ""
				}
				cur = v[idx]
			default:
				return ""
			}
		} else {
			switch v := cur.(type) {
			case map[string]interface{}:
				cur = v[t]
			default:
				return ""
			}
		}
	}
	if cur == nil {
		return ""
	}
	if s, ok := cur.(string); ok {
		return s
	}
	b, _ := json.Marshal(cur)
	return string(b)
}

func tokenizePath(path string) []string {
	path = strings.ReplaceAll(path, "[", ".")
	path = strings.ReplaceAll(path, "]", "")
	var out []string
	for _, p := range strings.Split(path, ".") {
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}


func execJSONExtract(node *Node, vv vars) job.LogStep {
	var d struct {
		Label      string `json:"label"`
		Input      string `json:"input"`
		Path       string `json:"path"`
		AllMatches bool   `json:"allMatches"`
		VarName    string `json:"varName"`
	}
	_ = json.Unmarshal(node.Data, &d)

	lbl := d.Label; if lbl == "" { lbl = "JSON Extract" }
	input := vv.inputOrBody(d.Input)

	var obj interface{}
	if err := json.Unmarshal([]byte(input), &obj); err != nil {
		return errStep("json_extract", lbl, "JSON parse error: "+err.Error())
	}

	var result string
	if d.AllMatches {
		tokens := tokenizePath(d.Path)
		result = jsonExtractAll(obj, tokens)
	} else {
		result = jsonDotPath(obj, d.Path)
	}

	vv.set(d.VarName, result)
	return job.LogStep{
		NodeType:  "json_extract",
		NodeLabel: lbl,
		Fields:    []job.LogField{field("path", d.Path), field("value", result)},
	}
}

func jsonExtractAll(obj interface{}, tokens []string) string {
	if len(tokens) == 0 {
		if s, ok := obj.(string); ok {
			return s
		}
		b, _ := json.Marshal(obj)
		return string(b)
	}
	t := tokens[0]
	rest := tokens[1:]

	switch v := obj.(type) {
	case map[string]interface{}:
		return jsonExtractAll(v[t], rest)
	case []interface{}:
		var parts []string
		for _, item := range v {
			val := jsonExtractAll(item, tokens)
			if val != "" {
				parts = append(parts, val)
			}
		}
		b, _ := json.Marshal(parts)
		return string(b)
	default:
		return ""
	}
}


func execSetVar(node *Node, vv vars) job.LogStep {
	var d struct {
		Label   string `json:"label"`
		VarName string `json:"varName"`
		Value   string `json:"value"`
	}
	_ = json.Unmarshal(node.Data, &d)

	val := vv.interp(d.Value)
	vv.set(d.VarName, val)

	lbl := d.Label; if lbl == "" { lbl = "Set Variable" }
	return job.LogStep{
		NodeType:  "set_variable",
		NodeLabel: lbl,
		Fields:    []job.LogField{field(d.VarName, val)},
	}
}


var (
	firstNames = []string{"James","John","Robert","Michael","William","David","Richard","Joseph","Thomas","Charles","Alice","Mary","Jennifer","Patricia","Linda","Barbara","Elizabeth","Susan","Jessica","Sarah","Karen","Lisa","Emma","Olivia","Noah","Liam","Ethan","Aiden","Lucas","Mason"}
	lastNames  = []string{"Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin","Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson"}
)

func execRandom(node *Node, vv vars) job.LogStep {
	var d struct {
		Label         string `json:"label"`
		DataType      string `json:"dataType"`
		Length        int    `json:"length"`
		Min           int    `json:"min"`
		Max           int    `json:"max"`
		Charset       string `json:"charset"`
		CustomCharset string `json:"customCharset"`
		VarName       string `json:"varName"`
		Domain        string `json:"domain"`
		CardType      string `json:"cardType"`
	}
	_ = json.Unmarshal(node.Data, &d)
	if d.Length <= 0 {
		d.Length = 8
	}

	var result string
	switch d.DataType {
	case "integer":
		lo, hi := d.Min, d.Max
		if hi <= lo {
			hi = lo + 1000
		}
		result = strconv.Itoa(lo + rIntn(hi-lo))
	case "float":
		result = fmt.Sprintf("%.4f", float64(d.Min)+rFloat64()*float64(d.Max-d.Min))
	case "uuid":
		b := make([]byte, 16)
		_, _ = cryptorand.Read(b)
		b[6] = (b[6] & 0x0f) | 0x40
		b[8] = (b[8] & 0x3f) | 0x80
		result = fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
	case "email":
		domain := d.Domain
		if domain == "" {
			domain = randStr(6, "abcdefghijklmnopqrstuvwxyz") + "." + []string{"com","net","org","io","co"}[rIntn(5)]
		}
		result = randStr(8, "abcdefghijklmnopqrstuvwxyz") + "@" + domain
	case "credit_card":
		result = randCreditCard(d.CardType)
	case "username":
		result = randStr(d.Length, "abcdefghijklmnopqrstuvwxyz0123456789")
	case "password":
		result = randStr(d.Length, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*")
	case "ip":
		result = fmt.Sprintf("%d.%d.%d.%d", rIntn(254)+1, rIntn(256), rIntn(256), rIntn(254)+1)
	case "ipv6":
		result = fmt.Sprintf("%04x:%04x:%04x:%04x:%04x:%04x:%04x:%04x",
			rIntn(0x10000), rIntn(0x10000), rIntn(0x10000), rIntn(0x10000),
			rIntn(0x10000), rIntn(0x10000), rIntn(0x10000), rIntn(0x10000))
	case "mac_address":
		result = fmt.Sprintf("%02x:%02x:%02x:%02x:%02x:%02x",
			rIntn(256), rIntn(256), rIntn(256), rIntn(256), rIntn(256), rIntn(256))
	case "name":
		result = firstNames[rIntn(len(firstNames))] + " " + lastNames[rIntn(len(lastNames))]
	case "phone":
		result = fmt.Sprintf("(%03d) %03d-%04d", 200+rIntn(800), 200+rIntn(800), rIntn(10000))
	case "hex_color":
		result = fmt.Sprintf("#%02x%02x%02x", rIntn(256), rIntn(256), rIntn(256))
	case "domain":
		result = randStr(6, "abcdefghijklmnopqrstuvwxyz") + "." + []string{"com","net","org","io","co"}[rIntn(5)]
	default:
		var charset string
		switch d.Charset {
		case "alpha":       charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
		case "numeric":     charset = "0123456789"
		case "hex":         charset = "0123456789abcdef"
		case "upper_alpha": charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
		case "lower_alpha": charset = "abcdefghijklmnopqrstuvwxyz"
		case "unicode":     result  = randUnicode(d.Length)
		case "custom":
			charset = d.CustomCharset
			if charset == "" {
				charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
			}
		default:            charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
		}
		if result == "" {
			result = randStr(d.Length, charset)
		}
	}

	vv.set(d.VarName, result)

	lbl := d.Label; if lbl == "" { lbl = "Random Data" }
	return job.LogStep{
		NodeType:  "random_data",
		NodeLabel: lbl,
		Fields:    []job.LogField{field(d.VarName, result)},
	}
}

func randStr(n int, charset string) string {
	if len(charset) == 0 {
		return ""
	}
	b := make([]byte, n)
	for i := range b {
		b[i] = charset[rIntn(len(charset))]
	}
	return string(b)
}

func randUnicode(n int) string {
	runes := make([]rune, n)
	for i := range runes {
		for {
			r := rune(rIntn(0xD800))
			if r >= 0x20 {
				runes[i] = r
				break
			}
		}
	}
	return string(runes)
}

type ccSpec struct {
	prefix []int
	length int
}

var ccSpecs = map[string][]ccSpec{
	"visa":       {{[]int{4}, 16}},
	"mastercard": {{[]int{5, 1}, 16}, {[]int{5, 2}, 16}, {[]int{5, 3}, 16}, {[]int{5, 4}, 16}, {[]int{5, 5}, 16}},
	"amex":       {{[]int{3, 4}, 15}, {[]int{3, 7}, 15}},
	"discover":   {{[]int{6, 0, 1, 1}, 16}},
	"jcb":        {{[]int{3, 5, 2, 8}, 16}, {[]int{3, 5, 8, 9}, 16}},
}

func randCreditCard(cardType string) string {
	all := []string{"visa", "mastercard", "amex", "discover", "jcb"}
	if cardType == "" || cardType == "random" {
		cardType = all[rIntn(len(all))]
	}
	options, ok := ccSpecs[cardType]
	if !ok {
		options = ccSpecs["visa"]
	}
	s := options[rIntn(len(options))]

	digits := make([]int, s.length)
	copy(digits, s.prefix)
	for i := len(s.prefix); i < s.length-1; i++ {
		digits[i] = rIntn(10)
	}
	digits[s.length-1] = luhnCheckDigit(digits[:s.length-1])

	b := make([]byte, s.length)
	for i, d := range digits {
		b[i] = byte('0' + d)
	}
	return string(b)
}

func luhnCheckDigit(prefix []int) int {
	sum := 0
	for i, d := range prefix {
		if (len(prefix)-i)%2 == 0 {
			d2 := d * 2
			if d2 > 9 {
				d2 -= 9
			}
			sum += d2
		} else {
			sum += d
		}
	}
	return (10 - sum%10) % 10
}


func execStringOp(node *Node, vv vars) job.LogStep {
	var d struct {
		Label     string `json:"label"`
		Operation string `json:"operation"`
		Input     string `json:"input"`
		Param1    string `json:"param1"`
		Param2    string `json:"param2"`
		VarName   string `json:"varName"`
	}
	_ = json.Unmarshal(node.Data, &d)

	input := vv.interp(d.Input)
	p1 := vv.interp(d.Param1)
	p2 := vv.interp(d.Param2)

	var result string
	switch d.Operation {
	case "upper":
		result = strings.ToUpper(input)
	case "lower":
		result = strings.ToLower(input)
	case "trim":
		result = strings.TrimSpace(input)
	case "trim_start":
		result = strings.TrimLeft(input, " \t\n\r")
	case "trim_end":
		result = strings.TrimRight(input, " \t\n\r")
	case "replace":
		result = strings.ReplaceAll(input, p1, p2)
	case "remove":
		result = strings.ReplaceAll(input, p1, "")
	case "regex_replace":
		re, err := cachedCompile(p1)
		if err != nil {
			result = input
		} else {
			result = re.ReplaceAllString(input, p2)
		}
	case "split":
		parts := strings.Split(input, p1)
		b, _ := json.Marshal(parts)
		result = string(b)
	case "join":
		var parts []string
		_ = json.Unmarshal([]byte(input), &parts)
		result = strings.Join(parts, p1)
	case "substring":
		runes := []rune(input)
		start, _ := strconv.Atoi(p1)
		end, _ := strconv.Atoi(p2)
		if start < 0 { start = 0 }
		if end <= 0 || end > len(runes) { end = len(runes) }
		if start <= end {
			result = string(runes[start:end])
		}
	case "length":
		result = strconv.Itoa(len([]rune(input)))
	case "count":
		result = strconv.Itoa(strings.Count(input, p1))
	case "reverse":
		runes := []rune(input)
		for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
			runes[i], runes[j] = runes[j], runes[i]
		}
		result = string(runes)
	case "repeat":
		n, _ := strconv.Atoi(p1)
		if n < 0 { n = 0 }
		result = strings.Repeat(input, n)
	case "pad_left":
		n, _ := strconv.Atoi(p2)
		pad := p1
		if pad == "" { pad = " " }
		result = input
		for len([]rune(result)) < n {
			result = pad + result
		}
	case "pad_right":
		n, _ := strconv.Atoi(p2)
		pad := p1
		if pad == "" { pad = " " }
		result = input
		for len([]rune(result)) < n {
			result += pad
		}
	case "starts_with":
		result = strconv.FormatBool(strings.HasPrefix(input, p1))
	case "ends_with":
		result = strconv.FormatBool(strings.HasSuffix(input, p1))
	case "contains":
		result = strconv.FormatBool(strings.Contains(input, p1))
	case "index_of":
		result = strconv.Itoa(strings.Index(input, p1))
	case "extract_between":
		result = parseBetween(input, p1, p2, "first")
	default:
		result = input
	}

	vv.set(d.VarName, result)

	lbl := d.Label; if lbl == "" { lbl = "String Op" }
	return job.LogStep{
		NodeType:  "string_op",
		NodeLabel: lbl,
		Fields:    []job.LogField{field(d.VarName, result)},
	}
}


func execEncodeDecode(node *Node, vv vars) job.LogStep {
	var d struct {
		Label     string `json:"label"`
		Operation string `json:"operation"`
		Input     string `json:"input"`
		VarName   string `json:"varName"`
	}
	_ = json.Unmarshal(node.Data, &d)

	input := vv.interp(d.Input)
	var result, opErr string

	switch d.Operation {
	case "base64_enc":
		result = base64.StdEncoding.EncodeToString([]byte(input))
	case "base64_url_enc":
		result = base64.URLEncoding.EncodeToString([]byte(input))
	case "base64_dec":
		b, err := base64.StdEncoding.DecodeString(padBase64(input))
		if err != nil {
			b, err = base64.URLEncoding.DecodeString(padBase64(input))
		}
		if err != nil { opErr = err.Error() } else { result = string(b) }
	case "base64_url_dec":
		b, err := base64.URLEncoding.DecodeString(padBase64(input))
		if err != nil { opErr = err.Error() } else { result = string(b) }
	case "url_enc":
		result = url.QueryEscape(input)
	case "url_dec":
		r, err := url.QueryUnescape(input)
		if err != nil { opErr = err.Error() } else { result = r }
	case "html_enc":
		result = htmlEscape(input)
	case "html_dec":
		result = htmlUnescape(input)
	case "hex_enc":
		result = hex.EncodeToString([]byte(input))
	case "hex_dec":
		b, err := hex.DecodeString(input)
		if err != nil { opErr = err.Error() } else { result = string(b) }
	case "json_stringify":
		b, err := json.Marshal(input)
		if err != nil { opErr = err.Error() } else { result = string(b) }
	case "json_parse":
		var obj interface{}
		if err := json.Unmarshal([]byte(input), &obj); err != nil {
			opErr = err.Error()
		} else {
			b, _ := json.Marshal(obj)
			result = string(b)
		}
	case "jwt_decode":
		parts := strings.Split(strings.TrimSpace(input), ".")
		if len(parts) != 3 {
			opErr = "invalid JWT: expected 3 dot-separated parts"
			break
		}
		b, err := base64.URLEncoding.DecodeString(padBase64(parts[1]))
		if err != nil {
			b, err = base64.RawURLEncoding.DecodeString(parts[1])
		}
		if err != nil { opErr = "payload decode failed: " + err.Error() } else { result = string(b) }
	default:
		result = input
	}

	vv.set(d.VarName, result)

	lbl := d.Label; if lbl == "" { lbl = "Encode/Decode" }
	return job.LogStep{
		NodeType:  "encode_decode",
		NodeLabel: lbl,
		Fields:    []job.LogField{field(d.VarName, result)},
		Error:     opErr,
	}
}

func padBase64(s string) string {
	switch len(s) % 4 {
	case 2: return s + "=="
	case 3: return s + "="
	}
	return s
}

func htmlEscape(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, `"`, "&quot;")
	s = strings.ReplaceAll(s, "'", "&#39;")
	return s
}

func htmlUnescape(s string) string {
	s = strings.ReplaceAll(s, "&amp;", "&")
	s = strings.ReplaceAll(s, "&lt;", "<")
	s = strings.ReplaceAll(s, "&gt;", ">")
	s = strings.ReplaceAll(s, "&quot;", `"`)
	s = strings.ReplaceAll(s, "&#39;", "'")
	s = strings.ReplaceAll(s, "&apos;", "'")
	return s
}


func execHash(node *Node, vv vars) job.LogStep {
	var d struct {
		Label          string `json:"label"`
		Algorithm      string `json:"algorithm"`
		Input          string `json:"input"`
		Key            string `json:"key"`
		Uppercase      bool   `json:"uppercase"`
		OutputEncoding string `json:"outputEncoding"`
		VarName        string `json:"varName"`
	}
	_ = json.Unmarshal(node.Data, &d)

	input := []byte(vv.interp(d.Input))
	key := []byte(vv.interp(d.Key))

	var h hash.Hash
	switch d.Algorithm {
	case "md5":        h = md5.New()
	case "sha1":       h = sha1.New()
	case "sha256":     h = sha256.New()
	case "sha512":     h = sha512.New()
	case "hmac_md5":   h = hmac.New(md5.New, key)
	case "hmac_sha1":  h = hmac.New(sha1.New, key)
	case "hmac_sha256":h = hmac.New(sha256.New, key)
	case "hmac_sha512":h = hmac.New(sha512.New, key)
	default:           h = sha256.New()
	}
	h.Write(input)
	sum := h.Sum(nil)

	var result string
	if d.OutputEncoding == "base64" {
		result = base64.StdEncoding.EncodeToString(sum)
	} else {
		result = hex.EncodeToString(sum)
	}
	if d.Uppercase {
		result = strings.ToUpper(result)
	}

	vv.set(d.VarName, result)

	lbl := d.Label; if lbl == "" { lbl = "Hash" }
	return job.LogStep{
		NodeType:  "hash",
		NodeLabel: lbl,
		Fields:    []job.LogField{field("algorithm", d.Algorithm), field(d.VarName, result)},
	}
}


type conditionRule struct {
	Field     string `json:"field"`
	FieldName string `json:"fieldName"`
	Op        string `json:"op"`
	Value     string `json:"value"`
}

type conditionBranch struct {
	ID    string          `json:"id"`
	Label string          `json:"label"`
	Logic string          `json:"logic"`
	Rules []conditionRule `json:"rules"`
}

func execCondition(node *Node, vv vars, statusCode int, body string) (job.LogStep, string, string) {
	var d struct {
		Label    string            `json:"label"`
		Branches []conditionBranch `json:"branches"`
	}
	_ = json.Unmarshal(node.Data, &d)

	matchedID := noMatchHandle
	matchedLabel := "(no match)"

	for _, br := range d.Branches {
		if evalBranch(br, vv, statusCode, body) {
			matchedID = br.ID
			matchedLabel = br.Label
			break
		}
	}

	lbl := d.Label; if lbl == "" { lbl = "Condition" }
	step := job.LogStep{
		NodeType:  node.Type,
		NodeLabel: lbl,
		Fields:    []job.LogField{field("branch", matchedLabel)},
	}
	return step, matchedLabel, matchedID
}

func evalBranch(br conditionBranch, vv vars, statusCode int, body string) bool {
	if len(br.Rules) == 0 {
		return true
	}
	results := make([]bool, len(br.Rules))
	for i, r := range br.Rules {
		results[i] = evalRule(r, vv, statusCode, body)
	}
	if br.Logic == "or" {
		for _, v := range results {
			if v { return true }
		}
		return false
	}
	for _, v := range results {
		if !v { return false }
	}
	return true
}

func evalRule(r conditionRule, vv vars, statusCode int, body string) bool {
	var subject string
	switch r.Field {
	case "status_code":
		subject = strconv.Itoa(statusCode)
	case "body":
		subject = body
	case "response_header":
		subject = vv["header_"+strings.ToLower(strings.ReplaceAll(r.FieldName, "-", "_"))]
	case "variable":
		subject = vv[r.FieldName]
	default:
		subject = vv.interp(r.Field)
	}
	want := vv.interp(r.Value)

	switch r.Op {
	case "eq":          return subject == want
	case "neq":         return subject != want
	case "contains":    return strings.Contains(subject, want)
	case "not_contains":return !strings.Contains(subject, want)
	case "gt":          a, _ := strconv.ParseFloat(subject, 64); b, _ := strconv.ParseFloat(want, 64); return a > b
	case "lt":          a, _ := strconv.ParseFloat(subject, 64); b, _ := strconv.ParseFloat(want, 64); return a < b
	case "gte":         a, _ := strconv.ParseFloat(subject, 64); b, _ := strconv.ParseFloat(want, 64); return a >= b
	case "lte":         a, _ := strconv.ParseFloat(subject, 64); b, _ := strconv.ParseFloat(want, 64); return a <= b
	case "regex":       re, err := cachedCompile(want); if err != nil { return false }; return re.MatchString(subject)
	case "is_empty":    return strings.TrimSpace(subject) == ""
	case "not_empty":   return strings.TrimSpace(subject) != ""
	case "starts_with": return strings.HasPrefix(subject, want)
	case "ends_with":   return strings.HasSuffix(subject, want)
	}
	return false
}


func decodeBytes(b []byte, enc string) string {
	var dec transform.Transformer
	switch enc {
	case "utf16le":
		dec = unicode.UTF16(unicode.LittleEndian, unicode.IgnoreBOM).NewDecoder()
	case "utf16be":
		dec = unicode.UTF16(unicode.BigEndian, unicode.IgnoreBOM).NewDecoder()
	case "shiftjis":
		dec = japanese.ShiftJIS.NewDecoder()
	case "eucjp":
		dec = japanese.EUCJP.NewDecoder()
	case "gbk":
		dec = simplifiedchinese.GBK.NewDecoder()
	case "latin1":
		dec = charmap.ISO8859_1.NewDecoder()
	case "cp1252":
		dec = charmap.Windows1252.NewDecoder()
	default:
		return string(b)
	}
	out, _, err := transform.Bytes(dec, b)
	if err != nil {
		return string(b)
	}
	return string(out)
}


func execTerminal(ctx context.Context, node *Node, vv vars) job.LogStep {
	var d struct {
		Label          string `json:"label"`
		Command        string `json:"command"`
		VarName        string `json:"varName"`
		Timeout        int    `json:"timeout"`
		OutputEncoding string `json:"outputEncoding"`
	}
	_ = json.Unmarshal(node.Data, &d)

	lbl := d.Label
	if lbl == "" {
		lbl = "Terminal"
	}

	cmd := vv.interp(d.Command)
	if cmd == "" {
		return errStep("terminal", lbl, "command is empty")
	}

	var execCtx context.Context
	var cancel context.CancelFunc
	if d.Timeout > 0 {
		execCtx, cancel = context.WithTimeout(ctx, time.Duration(d.Timeout)*time.Millisecond)
	} else {
		execCtx, cancel = context.WithCancel(ctx)
	}
	defer cancel()

	var shell, flag string
	if runtime.GOOS == "windows" {
		shell, flag = "cmd", "/C"
	} else {
		shell, flag = "sh", "-c"
	}

	var stdout, stderr bytes.Buffer
	c := exec.CommandContext(execCtx, shell, flag, cmd)
	c.Stdout = &stdout
	c.Stderr = &stderr
	err := c.Run()

	enc := d.OutputEncoding
	output := decodeBytes(stdout.Bytes(), enc)
	if output == "" {
		output = decodeBytes(stderr.Bytes(), enc)
	}
	output = strings.TrimRight(output, "\r\n")

	if d.VarName != "" {
		vv.set(d.VarName, output)
	}

	fields := []job.LogField{
		{Label: "command", Value: cmd},
		{Label: "output",  Value: output, Expandable: true},
	}
	if err != nil {
		return job.LogStep{NodeType: "terminal", NodeLabel: lbl, Fields: fields, Error: err.Error()}
	}
	return job.LogStep{NodeType: "terminal", NodeLabel: lbl, Fields: fields}
}

func execWait(ctx context.Context, node *Node) job.LogStep {
	var d struct {
		Label  string `json:"label"`
		Ms     int    `json:"ms"`
		Jitter int    `json:"jitter"`
	}
	_ = json.Unmarshal(node.Data, &d)

	dur := time.Duration(d.Ms) * time.Millisecond
	if d.Jitter > 0 {
		dur += time.Duration(rIntn(d.Jitter)) * time.Millisecond
	}
	select {
	case <-time.After(dur):
	case <-ctx.Done():
	}

	lbl := d.Label; if lbl == "" { lbl = "Wait" }
	return job.LogStep{
		NodeType:  "wait",
		NodeLabel: lbl,
		Fields:    []job.LogField{field("duration", fmt.Sprintf("%dms", d.Ms))},
	}
}
