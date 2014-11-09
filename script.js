
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

// | Accumulate a result `z' from applying `f' to `z' and `xs[i]'.
// foldr :: (a -> b -> b) -> b -> [a] -> b
function foldr(f, z, xs) {
    for (var i = 0; i < xs.length; i++) z = f(z, xs[i])
    return z
}

// | foldr treating `z' as the first element in `xs' instead.
function foldr1(f, xs){
    if (xs.length > 0) return foldr(f, head(xs), tail(xs))
    else error("foldr1: empty list")
}

// | Function composition, basically f(g(h(x))) = co(f, g, h)(x)
//   It is easier to read for human beans, and re-created with inspiration from
//   Haskell.
function co() {
    return foldr1(function(f, g) {
        return function(x) { return f(g(x)) }
    }, arguments)
}

// | Add a temporary className to an element, expires after `t' miliseconds.
// tempClass :: Elem -> String -> Int -> IO ()
function tempClass(e, c, t) {
    e.classList.add(c)

    setTimeout(function() {
        e.classList.remove(c)
    }, t)
}

// submit :: String -> Obj String String -> (String -> IO ()) -> IO ()
function submit(url, args, f) {
    var xhr = new XMLHttpRequest()
      , arg = ""

    xhr.open("POST", url, true)

    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded")
    xhr.setRequestHeader("Connection", "close")

    xhr.onload = function() {
        if (xhr.status === 200) f(xhr.responseText)
        else console.log("<submit> failed: " + xhr.status)
    }

    for (var k in args) arg += k + "=" + encodeURIComponent(args[k])

    xhr.send(arg)
}

// TODO skip on "", undefined or null.
// collectParams :: [Elem] -> Obj String String
function collectParams(inps) {
    var args = {}

    for (var i = 0; i < inps.length; i++)
        if (inps[i].value)
            args[inps[i].name] = inps[i].value

    return args
}

// this should be a default method
// isEmpty :: Obj a b -> Bool
Object.prototype.isEmpty = function() {
    return Object.keys(this).length === 0
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
            details.textContent += "Sum of files too large, please retry with "
                                 + "smaller files."

        } else
            formData.append("files[]", files[i], files[i].name)
    }

    var xhr = new XMLHttpRequest()

    xhr.open("POST", "/upload/", true)

    xhr.onload = function() {
        if (xhr.status === 200) success(xhr.responseText)
        else failure()
    }

    xhr.send(formData)
}

// success :: String -> IO ()
function success(rtxt) {
    console.log("File uploaded.")

    fileLabel.classList.remove("loading-background")

    tempClass(fileLabel, "success-background", 1000)
}

// failure :: IO ()
function failure() {
    console.log("File upload failure.")

    fileLabel.classList.remove("loading-background")
    tempClass(fileLabel, "error-shake", 1000)

    details.textContent = "Server error."
}

// events :: IO ()
function events() {
    // File selector event
    fileSelector.addEventListener("click", function(e) {
        this.value = null
    })

    fileSelector.addEventListener("change", upload)

    var auth = function(path, f) {
        var g = function(e) {
            e.preventDefault()

            // el hacky solution
            var pare = this.queryClimber("form") || this
              , inps = pare.querySelectorAll("input[name]")
              , args = collectParams(inps)

            console.log(pare.children)
            console.log(args)
            console.log(args.isEmpty())

            if (! args.isEmpty()) {
                submit(path, args, f) // XXX fix server-side

                window.location.href = "/files/" // XXX temporary
            }

            else
                window.location.href = path + "index.html"
        }

        return g
    }

    // TODO FIXME XXX placeholders for functions begone

    // Login event
    if (window.location.pathname === "/")
        login.addEventListener("click", auth("/login/", console.log))

    // Register event
    //if (["/", "/signup/", "/login/"].indexOf(window.location.pathname) !== -1)
    form.addEventListener("submit", auth(form.action, console.log))
}


function main() {
    events()
}

main()

