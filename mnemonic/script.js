
// JQuery? Convenience? What's what?

// {{{ Constants

var max_file_size = Math.pow(1024, 2) * 10

var fileSelector = document.querySelector("#upload")
var fileLabel = document.querySelector("[for='upload']")
var login = document.querySelector("[name='auth'] [type='button']")
var form = document.querySelector("form[name='auth']")

// }}}

// {{{ Globals

// State is evil, etc

// }}}

// {{{ Utility functions

// | Print a then return a
// trace :: a -> a
function trace(a) {
    console.log(a)

    return a
}

// id :: a -> a
function id(a) { return a }

// abyss :: a -> IO ()
function abyss(_) {}

// | Accumulate a result `z' from applying `f' to `z' and `xs[i]'.
// foldr :: (a -> b -> b) -> b -> [a] -> b
function foldr(f, z, xs) {
    for (var i = 0; i < xs.length; i++) z = f(z, xs[i])
    return z
}

// | foldr treating `z' as the first element in `xs' instead.
function foldr1(f, xs){
    if (xs.length > 0) return foldr(f, head(xs), tail(xs))
    else console.error("foldr1: empty list")
}

// | Function composition, basically f(g(h(x))) = co(f, g, h)(x)
//   It is easier to read for human beans, and re-created with inspiration from
//   Haskell.
function co() {
    return foldr1(function(f, g) {
        return function(x) { return f(g(x)) }
    }, arguments)
}

// Curry helper function
var _cur = function(f) {
    var args = [].slice.call(arguments, 1)

    return function() {
        return f.apply(this, args.concat([].slice.call(arguments, 0)))
    }
}

// | Currying, the best thing to pour over a dish of chicken and rice.
// cu :: (a -> b -> n) -> (a -> (b -> n))
var cu = function(f, len) {
    var args = [].slice.call(arguments, 1)
      , len = len || f.length

    return function() {
        if (arguments.length < len) {
            var comb = [f].concat([].slice.call(arguments, 0))

            return len - arguments.length > 0
                ? cu(_cur.apply(this, comb), len - arguments.length)
                : _cur.call(this, comb)

        } else
            return f.apply(this, arguments)
    }
}

// | Add a temporary className to an element, expires after `t' miliseconds.
// tempClass :: Elem -> String -> Int -> IO ()
function tempClass(e, c, t) {
    e.classList.add(c)

    setTimeout(function() {
        e.classList.remove(c)
    }, t)
}

// | XHR request
// request :: String -> String -> a -> (XHR -> IO ()) -> (XHR -> IO ()) -> IO ()
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

// | POST and GET requests
var post = cu(request)("POST")
var get = cu(request)("GET")

// | Object to FormData
// objToData :: Obj String String -> FormData
function objToData(o) {
    console.log(o) // XXX TEMPORARY

    var fd = new FormData()

    for (var k in o) fd.append(k, encodeURIComponent(o[k]))

    return fd
}

// | FUNCTIONAL PROGRAMMING FUNCTIONAL EVERYTHING FUNCTIONS FUNCTIONS FUNCTIONS
// submit :: String -> Obj String String -> (XHR -> IO ()) -> IO ()
function submit(url, o, f) {
    post(url, objToData(o), f, abyss, {})
}

// | Collect "value"s from elements in the list and return as object
// collectParams :: [Elem] -> Obj String String
function collectParams(inps) {
    var args = {}

    for (var i = 0; i < inps.length; i++)
        if (inps[i].value)
            args[inps[i].name] = inps[i].value

    return args
}

// | Query selector going up the DOM instead
// queryClimber :: Elem -> String -> Elem
HTMLElement.prototype.queryClimber = function(s) {
    var e = null
    var c = this.parentNode

    while ((! e) && c) {
        c = c.parentNode
        e = c.querySelector(s)
    }

    return e
}

// }}}

// | Upload a file to the server.
// upload :: Event -> IO ()
function upload(e) {
    console.log(this.value)

    fileLabel.classList.add("loading-background")

    var files = fileSelector.files

    console.log(files)

    var formData = new FormData()

    var total_filesize = 0

    for (var i = 0; i < files.length; i++) {
        console.log(files[i].size + " > " + max_file_size)
        if (files[i].size > max_file_size) {
            tempClass(fileLabel, "error-shake", 500)

            console.log("File \"" + files[i].name
                                 + "\" too large, please retry with a smaller "
                                 + "file.\n")

        } else if (total_filesize > max_file_size) {
            tempClass(fileLabel, "error-shake", 500)

            console.log("File \"" + files[i].name
                                  + "\" too large, please retry with a smaller "
                                  + "file.\n")

        } else
            formData.append("files[]", files[i], files[i].name)
    }

    post("/upload/", formData, success, failure, {})
}

// success :: XHR -> IO ()
function success(xhr) {
    console.log(xhr.responseText)

    fileLabel.classList.remove("loading-background")

    tempClass(fileLabel, "success-background", 1000)
}

// failure :: _ -> IO ()
function failure(_) {
    console.log("File upload failure; server.")

    fileLabel.classList.remove("loading-background")
    tempClass(fileLabel, "error-shake", 1000)
}

// events :: IO ()
function events() {
    // File selector event
    fileSelector.addEventListener("click", function(e) {
        this.value = null
    })

    fileSelector.addEventListener("change", upload)

    var auth = function(path, f) {
        return function(e) {
            e.preventDefault()

            // el hacky solution
            var pare = this.queryClimber("form") || this
              , inps = pare.querySelectorAll("input[name]")
              , args = collectParams(inps)

            if (! (Object.keys(args).length === 0)) {
                submit(path, args, f)

                //window.location.href = "/files/" // XXX temporary
            }

            else
                window.location.href = path + "index.html"
        }
    }

    // TODO FIXME XXX placeholders for functions begone

    // Login event
    if (window.location.pathname === "/")
        login.addEventListener("click", auth("/login/", trace))

    // Register event
    //if (["/", "/signup/", "/login/"].indexOf(window.location.pathname) !== -1)
    form.addEventListener("submit", auth(form.action, trace))
}


function main() {
    events()
}

main()

