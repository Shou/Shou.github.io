
/* Hipster af style
    - no semicolons
    - first-class and generalized functions
    - types in comments
    - commas before values in arrays
    - empty lines after blocks
    - indent by four spaces
*/

// {{{ Variables

// XXX temporary
var char = { cheeky: [ "http://i.imgur.com/u9cAaQy.jpg"
                     , "http://i.imgur.com/G5W7Zj3.jpg"
                     , "http://i.imgur.com/hew6x3f.jpg"
                     , "http://i.imgur.com/JrR1X7r.gif"
                     ]
           , vitality: [ "http://i.imgur.com/3BEaY7X.jpg"
                       , "http://i.imgur.com/8vzv4Ge.png"
                       , "http://i.imgur.com/c9unMhy.jpg"
                       ]
           , formality: [ "http://i.imgur.com/MqtFji9.jpg"
                        , "http://i.imgur.com/by0tO31.jpg"
                        ]
           , negativity: [ "http://i.imgur.com/lucwM2F.png"
                         , "http://i.imgur.com/gc1CNAm.jpg"
                         ]
           , curiosity: [ "http://i.imgur.com/D4gm66c.jpg"
                        ]
           , melancholy: [ "http://i.imgur.com/s7GlH0k.jpg"
                         ]
           , lethargy: [ "http://i.imgur.com/8gK82BC.jpg"
                       ]
           , worry: [ "http://i.imgur.com/qS8dGzf.jpg"
                    , "http://i.imgur.com/VHqo2Wz.jpg"
                    , "http://i.imgur.com/3cJdXfC.png"
                    ]
           }

// }}}

// {{{ Utils

// log :: a -> IO ()
var log = function(x) { console.log(x) }

// trace :: a -> IO a
var trace = function(x) { console.log(x); return x }

// id :: a -> a
var id = function(x) { return x }

// abyss :: a -> IO ()
var abyss = function(_) {}

// genericLength :: a -> Integer
function genericLength(a) {
    if (typeof a === "number") return a
    else if (typeof a === "object") return objectLength(a)
    else if (typeof a === "string") return a.length
    else if (typeof a === "undefined") return 0
}

// objectLength :: Obj a b -> Integer
function objectLength(a) {
    if (a === null) return 0
    else if (a.constructor.name === "Array") return a.length

    var len = 0
    for (k in a) tmp++
    return len
}

// | Run a function on `m' only if it isn't nothing, i.e. null, undefined,
//   otherwise return `b'
// maybe :: b -> (a -> b) -> Maybe a -> b
function maybe(b, f, m) {
    if (m !== null && m !== undefined) return f(m)
    else return b
}

// | Create a single element.
// makeElem :: String -> Obj String String -> Elem
function makeElem(name, attrs) {
    var e = document.createElement(name)
    for (k in attrs) e[k] = attrs[k]
    return e
}

// | Create multiple elements from a tree.
// makeElems :: String -> Obj String String -> Tree -> Elem
function makeElems(name, attrs, tree) {
    var p = makeElem(name, attrs)
    var len = Math.floor(tree.length / 3)

    for (var i = 0; i < len; i++) {
        var e = makeElems(tree[i * 3], tree[i * 3 + 1], tree[i * 3 + 2])
        p.appendChild(e)
    }

    return p
}

// keys :: Obj a b -> [a]
function keys(o) {
    var tmp = []
    for (var k in o) tmp.push(k)
    return tmp
}

// randomElem :: [a] -> a
function randomElem(xs) {
    return xs[Math.floor(Math.random() * xs.length)]
}

// request :: String -> String -> a -> (XHR -> IO ()) -> (XHR -> IO ()) ->
//            Obj String String -> IO ()
function request(meth, url, args, succ, fail, headers) {
    var xhr = new XMLHttpRequest()

    xhr.open(meth, url, true)

    for (header in headers) xhr.setRequestHeader(header, headers[header])

    xhr.onload = function() {
        if (xhr.status === 200) succ(xhr)
        else fail(xhr)
    }

    console.log(args)

    xhr.send(args)
}

// }}}

// {{{ Language analysing

// XXX this is just a very primitive prototype with thoughtless assumptions
// TODO
// | Perform sentiment analysis on text
// analyze :: String -> String
function analyze(text) {
    var mood = { cheeky: 0
               , vitality: 0
               , negativity: 0
               , curiosity: 0
               , melancholy: 0
               , lethargy: 0
               , worry: 0
               , formality: 0
               }

    var uppercaseLength = genericLength(text.match(/[A-Z]/g))
    var lowercaseLength = genericLength(text.match(/[a-z]/g))
    var punctuationLength = genericLength(text.match(/[.;,]/g))
    var swearingLength = genericLength(text.match(/fuck|shit|dick|asshole|cunt|fag|scum|trash/ig))
    var exclamationLength = genericLength(text.match(/!/g))
    var questionLength = genericLength(text.match(/\?|who|what|when|where|why/ig))
    var positiveLength = genericLength(text.match(/yeah|yes|good|great|amazing|beautiful|cute|love/))
    var cheekyLength = genericLength(text.match(/^>|l[eo]+l|lmf?ao|kek|(h[ae]){2,}/ig))
    var worryLength = genericLength(text.match(/no|nope|help/ig))
    var sadLength = genericLength(text.match(/sad|cry|why|please/ig))

    mood.cheeky = ( cheekyLength * 5 ) / text.length
    mood.vitality = ( uppercaseLength
                    + (exclamationLength * 5)
                    + positiveLength
                    ) / text.length
    mood.formality = ( lowercaseLength * (1 >> uppercaseLength ^ 1)
                     >> uppercaseLength
                     + punctuationLength
                     ) / text.length
    mood.negativity = swearingLength * 10 * (1 >> positiveLength) / text.length
    mood.curiosity = questionLength * 5 / text.length
    mood.melancholy = ( lowercaseLength * 0.5 * (1 >> uppercaseLength) + sadLength
                      ) / text.length
    mood.lethargy = lowercaseLength * 0.5 * (1 >> uppercaseLength) / text.length
    mood.worry = worryLength * 5 / text.length

    var maxKey

    for (k in mood) maxKey = (mood[k] < mood[maxKey] && maxKey ? maxKey : k)

    log(mood)
    log(maxKey)

    return maxKey
}

// }}}

// {{{ Parsing

// | Failed parsing, returns remaining input, error contexts and error message.
// Fail :: String -> [String] -> String -> Result a
function Fail(i, cs, e) {
    this.input = i
    this.contexts = cs
    this.error = e
}

// | Partial result, needs more input to satisfy parser rules
// Partial :: (String -> Result String a) -> Result a
function Partial(f) {
    this.f = f
}

// | Successful parsing, returns any remaining input and the result.
// Done :: String -> a -> Result a
function Done(i, r) {
    this.input = i
    this.result = r
}

// TODO remember it should be lazy, i.e. not run until `parse' is called.
// | Generic parser to be used for the chat protocol
// Parser :: Parser
function Parser(input) {
    this.input = input
    this.pos = 0
    this.more = true
}

// parse :: String -> Result a
Parser.prototype.parse = function(input) {
    return this.result
}

// | Feed the parser a case-insensitive string.
// asciiCI :: Parser String
Parser.prototype.asciiCI = function(str) {
    return function(result) {
        if (this.text.substr(0, str.length).toLowercase() === str.toLowercase()) {
            this.text = this.text.slice(str.length)
            return this.text.substr(0, str.length)
        }
    }
}

// | Feed the parser a string
// string :: Parser String
Parser.prototype.string = function(str) {
    if (this.text.substr(0, str.length) === str) {
        this.text = this.text.slice(str.length)
        return str
    }
}

// | Skip over a space
// skipSpace :: Parser ()
Parser.prototype.skipSpace = function() {
    if (this.text[0] === ' ')
        this.status = this.text.slice(1)
}

// }}}

// {{{ Characters

// makeChar :: String -> String -> String -> IO ()
function makeChar(id, isrc, msg) {
    var c = makeElems("div", { id: id, className: "char" }, [
        "p", { textContent: msg }, [],
        "img", { src: isrc, alt: isrc }, []
    ])

    document.querySelector("main").appendChild(c)
}

// updateChar :: String -> String -> String -> IO ()
function updateChar(id, isrc, msg) {
    var c = document.getElementById(id)

    if (c) {
        var img = c.querySelector("img")
        var p = makeElem("p", { textContent: msg })

        img.src = isrc
        img.alt = isrc
        c.insertBefore(p, img)

    } else makeChar(id, isrc, msg)
}

// }}}

// {{{ Network

// write :: String -> IO ()
WebSocket.prototype.write = function(s) {
    log(" → " + s)
    this.send(s)
}

// TODO
// connect :: String -> Int -> Bool -> IO ()
function connect(host, port = 8080, ssl = false) {
    var ws = new WebSocket((ssl ? "wss://" : "ws://") + host + ':' + port)

    ws.onmessage = initIRC
    ws.onclose = function() {
        ws.onmessage = abyss
        ws.onclose = abyss
    }

    return ws
}

// TODO
// disconnect :: WebSocket -> IO ()
function disconnect(ws) {
    ws.onmessage = abyss
    ws.onclose = abyss
    ws.close()
}

// }}}

// {{{ IRC

// initIRC :: MessageEvent -> IO ()
function initIRC(me) {
    me.target.onmessage = parseIRC

    log(me)

    var nick = "Weebchat[" + Math.floor(Math.random() * 10) + "]"
    me.target.write("NICK " + nick)
    me.target.write("USER " + nick + " 0 * :" + nick)
}

// XXX
// parseIRC :: MessageEvent -> IO ()
function parseIRC(me) {
    log(me.data)

    // XXX is this a bug or does irc send newlines 4 some reason???
    //     seriously wat
    // FIXME fuck websockets!!!!
    // TODO check Chabunko websocket client 4 how you fixed it

    // XXX temporary, replace with actual parser once done
    if (me.data.startsWith("PING"))
        me.target.write(me.data.replace("PING", "PONG"))

    // XXX temporary, replace with actual parser once done
    if (me.data.contains("PRIVMSG")) {
        var msg = me.data.split(':').slice(2).join(':')
        test(msg)
    }
}

// TODO
// ircParser :: 
function ircParser() {
}

// }}}

// XXX temporary
function test(msg) {
    var mood = analyze(msg)
    var imgs = maybe([""], id, char[mood])
    var isrc = randomElem(imgs)
    updateChar("Shou", isrc, msg)
}


function main() {
    var inp = document.querySelector("footer > input")
    inp.addEventListener("keydown", function(e) {
        if (e.keyCode === 13 && this.value) {
            test(this.value)

            ws.write("PRIVMSG #weebchat :" + this.value)

            this.value = ""
        }
    })
}

