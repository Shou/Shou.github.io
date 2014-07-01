
// ==UserScript==
// @name            Coup-Z
// @description     We gay now
// @version         0.1.3.2
// @include         http*://*.zetaboards.com/*
// @author          Shou
// @copyright       2013, Shou
// @license         GPL-3
// ==/UserScript==

// XXX
// - Cache

// FIXME
// - getPosts: `butt' is undefined
//      - The element is not found???
// - Header color doesn't change in Simple.
// - Spoiler/code header not working because of background-image.
// - Account for `delete' button.
//      - Probable cause of `butt' is undefined.
// - Fix buttons, they should stay the same if non-existing!
//      - Also replace content instead if no image found.
//      - Buttons should only be replaced when the background color or image
//        is modified.
// - QuoteHeader color doesn't change
//      - select dt or w/e element below somehow!

// TODO
// - Make it work in single posts.
// - Display signatures if JSON is incorrect.
//      - Only a certain height or amount of text???
// - Ignore list
//      - Specific selectors and declarations?

// {{{ Variables

var debug = true


var doms = { "Avatar": null, "Date": null, "Edit": null
           , "Post": null, "Urls": null, "Username": null, "Spoiler": null
           , "SpoilerHeader": null, "Code": null, "Quote": null
           , "QuoteHeader": null, "Header": null, "Footer": null
           , "Button": null, "ButtonOn": null, "ButtonOff": null
           , "UsertitleImage": null, "UserInfo": null, "Warnings": null
           }
var subs = { "id": null, "hover": null, "after": null, "before": null
           , "hover:after": null, "hover:before": null
           }
var props = { "background": /./
            , "background-attachment": /^((scroll|fixed|local),?\s?)+$/
            , "background-color": /./
            , "background-image": /./
            , "background-position": /./
            , "background-repeat": /^((repeat|repeat-x|repeat-y|no-repeat|inherit),?\s?)+$/
            , "background-clip": /^((border-box|padding-box|content-box),?\s?)+$/
            , "background-origin": /^((border-box|padding-box|content-box),?\s?)+$/
            , "background-size": /./
            , "border": /./
            , "border-color": /./
            , "border-style": /^((none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset|inherit),?\s?)+$/
            , "border-width": /./
            , "border-radius": /./
            , "border-bottom-left-radius": /./
            , "border-bottom-right-radius": /./
            , "border-top-left-radius": /./
            , "border-top-right-radius": /./
            , "border-image": /./
            , "box-shadow": /./
            , "color": /./
            , "content": /./
            , "counter-reset": /./
            , "counter-increment": /./
            , "cursor": /./
            , "font-family": /./
            , "font-size": /./
            , "font-style": /^((normal|italic|oblique|inherit),?\s?)+$/
            , "font-weight": /./
            , "letter-spacing": /./
            , "margin": /./
            , "max-width": /./
            , "max-height": /./
            , "overflow-x": /./
            , "overflow-y": /./
            , "opacity": /./
            , "padding": /./
            , "text-align": /./
            , "text-decoration": /./
            , "text-indent": /./
            , "text-overflow": /./
            , "text-shadow": /./
//            , "transform": /./
            , "vertical-align": /./
            , "visibility": /^((visible|hidden|collapse|inherit),?\s?)+$/
            }

// TODO account for video and audio ?GET=attributes
var embeds =
    { "vimeo":
        { u: "https?:\\/\\/vimeo\\.com\\/(\\S+)"
        , e: '<iframe src="//player.vimeo.com/video/$1" width="640" height="380" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>'
        , s: "//player.vimeo.com/video/$1"
        }
    , "soundcloud":
        { u: "(https?:\\/\\/soundcloud\\.com\\/\\S+)"
        , e: '<iframe width="100%" height="166" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url=$1"></iframe>'
        , s: "https://w.soundcloud.com/player/?url=$1"
        }
    , "audio":
        { u: "(https?:\\/\\/\\S+?\\.(mp3|ogg))"
        , e: '<audio src="$1" controls width="320" height="32"></audio>'
        , s: "$1"
        }
    , "video":
        { u: "(https?:\\/\\/\\S+?\\.(ogv|webm|mp4))"
        , e: '<video src="$1" controls muted autoplay loop style="max-width: 640px"></audio>'
        , s: "$1"
        }
    , "vine":
        { u: "https?:\\/\\/vine.co\\/v\\/([a-zA-Z0-9]+)"
        , e: '<iframe class="vine-embed" src="https://vine.co/v/$1/embed/simple" width="480" height="480" frameborder="0"></iframe><script async src="//platform.vine.co/static/scripts/embed.js" charset="utf-8"></script>'
        , s: "https://vine.co/v/$1/embed/simple"
        }
    }

// }}}

// {{{ Data

// Post :: Elem -> String -> String -> Elem -> Post
function Post(elem, id, mid, sig, butts) {
    this.elem = elem
    this.id = id
    this.mid = mid
    this.sig = sig
    this.butts = butts
}

// User :: String -> String -> User
function User(name, id) {
    this.name = name
    this.id = id
}

// }}}

// {{{ Utils

// log :: Show a => a -> IO ()
function log(s) {
    if (debug) console.log(s)
}

// id :: a -> a
function id(a) { return a }

// | Map a function over a list.
// map :: (a -> b) -> [a] -> [b]
function map(f, xs) {
    var tmp = []
    for (var i = 0; i < xs.length; i++) tmp.push(f(xs[i]))
    return tmp
}

// | No more Flydom!
// speedcore :: String -> Obj -> Tree -> DOMObj
function speedcore(tagname, attrs, childs) {
    var e = document.createElement(tagname);
    for (k in attrs){
        if (typeof attrs[k] === "object")
            for (l in attrs[k])
                e[k][l] = attrs[k][l];
        else e[k] = attrs[k];
    }
    for (var i = 0; i < childs.length; i = i + 3){
        var el = speedcore( childs[i]
                          , childs[i + 1]
                          , childs[i + 2]
                          );
        e.appendChild(el);
    }
    return e;
}

// isThread :: IO Bool
function isThread() {
    return window.location.href.match(/zetaboards\.com\/\S+\/topic\/[0-9]+/i)
}

// isForum :: IO Bool
function isForum() {
    return window.location.href.match(/zetaboards\.com\/\S+\/forum\/[0-9]+/i)
}

// isSig :: IO Bool
function isSig() {
    return window.location.href.match(/zetaboards\.com\/\S+\/home\/\?c=32/i)
}

// isSingle :: IO Bool
function isSingle() {
    return window.location.href.match(/zetaboards\.com\/\S+\/single\//i)
}

// | Get the currently selected <option> in a <select>
// selected :: Elem -> Elem
function selected(e) {
    return e.children[e.selectedIndex]
}

// safeObj :: Obj -> String -> a -> Obj
function safeObj(o, k, v) {
    if (!(k in o)) o[k] = v

    return o
}

// td :: Elem -> IO Elem
function td(e) {
    var t = document.createElement("td")
    t.appendChild(e)
    return t
}

// username :: IO User
function username() {
    var u = document.getElementById("top_info").getElementsByTagName("a")[0]
    return new User(u.textContent, u.href.match(/(\d+)\/$/)[1])
}

// last :: [a] -> a
function last(xs) {
    return xs[xs.length - 1]
}

// flash :: Elem -> IO ()
function flash(e, c) {
    e.style.backgroundColor = c

    setTimeout(function() {
        e.style.backgroundColor = null
    }, 1000)
}

// slice :: [a] -> Int -> Int -> [a]
var slice = Array.prototype.slice

// }}}

// {{{ Styling

// TODO make it safe; as in, only apply anything if the user actually has a style
// style :: Elem -> Post -> IO ()
function style(e, post) {
    log(post)

    var pe = post.elem
    var id = post.id
    var mid = post.mid
    var styles = post.sig
    var butts = post.butts

    var sig = pe.parentNode.nextElementSibling.nextElementSibling.querySelector(".c_sig")

    var json
    try {
        json = JSON.parse(styles)

        // Nickname
        log("json.Nick: " + json.Nick)
        if (json.Nick && json.Nick !== "") {
            var me = pe.getElementsByClassName("member")[0]
            if (!me.title) me.title = me.textContent
            me.textContent = json.Nick.substr(0, 100)
        }

        // Header
        if (json.Header && json.Header !== {}) {
            css(e, '#' + id, json.Header)
            css(e, '#' + id + " > td", {"id": { background: "none !important;"}})
            css(e, '#' + id + " td", {id: { border: "0px solid transparent"}})
        }
        // Username
        css(e, "a.member[href*=\"" + mid + "\"]", json.Username)
        // Date
        css(e, '#' + id + " > .c_postinfo > span.left", json.Date)
        // Avatar
        css(e, '#' + id + " + tr .avatar", json.Avatar)
        // UserInfo
        css(e, '#' + id + " + tr .c_user:not(img)", json.UserInfo)
        // Title
        css(e, '#' + id + " + tr .usertitle", json.Title)
        // Usertitle Image
        css(e, '#' + id + " + tr .usertitle img", json.UsertitleImage)
        // Warnings
        css(e, '#' + id + " + tr .warn", json.Warnings)
        // Edit text
        css(e, '#' + id + " + tr .editby", json.Edit)
        // Urls
        css(e, '#' + id + " + tr a", json.Urls)
        // Post
        css(e, '#' + id + " + tr > .c_post", json.Post)
        // Spoiler
        css(e, '#' + id + " + tr .spoiler_toggle", json.SpoilerHeader)
        css(e, '#' + id + " + tr .spoiler", json.Spoiler)
        // Quote
        css(e, '#' + id + " + tr blockquote dl", json.QuoteHeader)
        if (json.Quote && json.Quote !== {}) {
            css(e, '#' + id + " + tr blockquote", json.Quote)
            css(e, '#' + id + " + tr blockquote *:not(dl):not(dt)", { id: { background: "none !important;" } })
        }
        // Code
        css(e, '#' + id + " + tr code", json.Code)
        // Footer
        if (json.Footer && json.Footer !== {}) {
            css(e, '#' + id + " + tr + tr + tr", json.Footer)
            css(e, '#' + id + " + tr + tr + tr > td", {id: { background: "none !important;"}})
            css(e, '#' + id + " + tr + tr + tr td", {id: { border: "0px solid transparent"}})
        }
        // Buttons
        if (json.ButtonOn && json.ButtonOn !== {}
        && json.ButtonOff && json.ButtonOff !== {}
        && json.Button && json.Button !== {}) {
            fixButts(butts, true)
            css(e, '#' + id + " + tr + tr + tr .b_on", json.ButtonOn)
            css(e, '#' + id + " + tr + tr + tr .b_off", json.ButtonOff)
            css(e, '#' + id + " + tr + tr + tr a", json.Button)

        } else if (json.Button && json.Button !== {}) {
            fixButts(butts, false)
            css(e, '#' + id + " + tr + tr + tr a", json.Button)
        }

        sig.style.display = "none"

    } catch(e) {
        log("styles: " + styles)
        log("style: " + e)

        try {
            sig.style.maxHeight = "200px"

        } catch(e) {
            log("No signature!")
        }
    }
}

// TODO make it safe; a dec can be "} #evil { malicious: code !important;"
// XXX can sub-selectors be used maliciously? #ngh
// css :: Elem -> String -> Obj -> IO ()
function css(e, sel, dec) {
    if (dec === undefined) log("css: dec (" + sel + ") is undefined.")

    else {
        for (sub in dec) {
            var decl = flatcss(dec[sub])

            if (sub === "id") {
                var rule = sel + " { " + decl + '}'
                e.textContent += "\n" + rule

            } else {
                var rule = sel + ':' + sub.replace(',', '') + " { " + decl + " }"
                e.textContent += "\n" + rule
            }
        }
    }
}

// | Flatteen a CSS object into a CSS String.
// flatcss :: Obj -> String
function flatcss(o) {
    var tmp = ""

// FIXME
//    var bnd
//    try {
//        bnd = JSON.parse(localStorage["coup-z-banned"])
//
//    } catch(e) {
//        bnd = []
//    }

    for (var k in o)
        tmp += k.replace(/{}/g, '') + ": " + o[k].replace(/{}/g, '') + "; "

    return tmp
}

// | Inserts a <style> at the bottom of the content and returns it.
// elemStyle :: IO Elem
function elemStyle() {
    var bdy = document.body
    var sty = document.createElement("style")
    bdy.insertBefore(sty, bdy.children[bdy.children.length - 1])
    //sty.textContent = ".c_sig:not([id='c_post']) { display: none; } "

    return sty
}

// hideSigs :: [Elem] -> IO ()
function hideSigs(posts) {
    for (var i = 0; i < posts.length; i++) {
        try {
            var pe = posts[i].elem
            var lastr = pe.parentNode.nextElementSibling.nextElementSibling
            var sig = lastr.querySelector(".c_sig")

            try {
                JSON.parse(sig.textContent.trim())
                sig.style.display = "none"

            } catch(e) {
                log("No styles!")

                sig.style.maxHeight = "200px"

            }

        } catch (e) {
            log("No signature? " + e.toString())
        }
    }
}

// }}}

// {{{ Getter

// getPosts :: IO [Post]
function getPosts() {
    var posts = document.getElementsByClassName("c_username")
    var tmp = []

    for (var i = 0; i < posts.length; i++) {
        try {
            var elem = posts[i]
            var id = posts[i].parentNode.id
            var mid = posts[i].children[0].href.match(/[0-9]+\/$/i)[0]
            var wpost = posts[i].parentNode.nextElementSibling
            var sig = wpost.nextElementSibling
            var buttons = sig.nextElementSibling.getElementsByTagName("a")

            tmp.push(new Post(elem, id, mid, sig.textContent.trim(), buttons))

        } catch(e) {
            log(e.toString())
        }
    }

    return tmp
}

// fixButts :: [Elem] -> Bool -> IO ()
function fixButts(buttons, b) {
    for (var j = 0; j < buttons.length; j++) {
        try {
            log("butts " + j)
            log(buttons)
            log(buttons[j])

            var butt = buttons[j].getElementsByTagName("img")[0]

            if (butt !== undefined) {
                if (butt.alt === "PM Online Member" && b) {
                    buttons[j].innerHTML = "On"
                    buttons[j].className = "b_on"

                } else if (butt.alt === "PM Offline Member" && b) {
                    buttons[j].innerHTML = "Off"
                    buttons[j].className = "b_off"

                } else if (butt.alt === "Profile")
                    buttons[j].innerHTML = "Profile"

                else if (butt.alt === "Edit Post")
                    buttons[j].innerHTML = "Edit"

                else if (butt.alt === "Quote Post")
                    buttons[j].innerHTML = "Quote"

                else if (butt.alt === "Goto Top")
                    buttons[j].innerHTML = "^"
            }

        } catch(e) { log("fixButts: " + e) }

    }
}

// }}}

// {{{ Preview

// preview :: String -> String -> IO Elem
function preview(username, url) {
    return speedcore(
        "table", { id: "topic_viewer", className: "topic" }, [
            "tbody", {}, [
                "tr", { id: "coup-z-post" }, [
                    "td", { className: "c_username" }, [
                        "a", { className: "member"
                             , href: url
                             , textContent: username
                             , title: "Click to change nickname."
                             , onclick: changeNick
                             }, [],
                        "a", { name: "" }, []
                    ],
                    "td", { className: "c_postinfo" }, [
                        "span", { className: "left"
                                , textContent: "Today, 1:37 PM"
                                }, [],
                        "span", { className: "right" }, [
                            "a", { rel: "nofollow"
                                 , href: "javascript:;"
                                 , textContent: "Post #1"
                                 }, []
                        ]
                    ]
                ],
                "tr", {}, [
                    "td", { className: "c_user", rowspan: "2" }, [
                        "div", { style: "margin:auto;max-width:180px;max-height:180px;" }, [
                            "img", { className: "avatar"
                                   , border: "0"
                                   , style: "max-width:170px; max-height:170px; cursor:pointer;"
                                   , alt: "Click to change avatar."
                                   , title: "Click to change avatar."
                                   , src: localStorage["coup-z-avatar"]
                                   , onclick: changeSrc
                                   }, []
                        ],
                        "div", { className: "usertitle"
                               , textContent: "The quick brown fox jumps over the lazy dog"
                               , onclick: changeText
                               }, [
                            "br", {}, [],
                            "div", {}, []
                        ],
                        "img", { className: "c_user", height: "1", alt: ""
                               , src: "http://z3.ifrm.com/static/blank.gif"
                               }, []
                    ],
                    "td", { className: "c_post" }, [
                        "blockquote", {}, [
                            "dl", {}, [
                                "dt", { textContent: "Anonymous" }, [],
                                "dd", { innerHTML: "&nbsp;" }, []
                            ],
                            "div", { textContent: "I like Naruto" }, []
                        ],
                        "span", { textContent: "You're dumb and a nerd!! " }, [],
                        "a", { textContent: "Here's why!", href: "javascript:;" }, [],
                        "br", {}, [],
                        "br", {}, [],
                        "div", { className: "spoiler_toggle"
                               , textContent: "Spoiler: click to toggle"
                               }, [],
                        "div", { className: "spoiler"
                               , textContent: "Now get out!"
                               }, [],
                        "div", { className: "editby" }, [
                            "span", { textContent: "Edited by " }, [],
                            "a", { href: url
                                 , textContent: username
                                 }, [],
                            "span", { textContent: ", Today, 1:39 PM." }, []
                        ]
                    ]
                ],
                "tr", {}, [],
                "tr", { className: "c_postfoot" }, [
                    "td", {}, [
                        "a", { className: "b_on"
                             , href: "javascript:;"
                             , textContent: "On"
                             }, [
                            "img", {}, []
                        ],
                        "a", { className: "b_prof"
                             , href: "javascript:;"
                             , textContent: "Profile"
                             }, []
                    ],
                    "td", { className: "c_footicons" }, [
                        "span", { className: "left" }, [
                            "a", { href: "javascript:;"
                                 , textContent: "Edit"
                                 }, []
                        ],
                        "span", { className: "right" }, [
                            "input", { className: "multi_quote"
                                     , type: "checkbox"
                                     , title: "multi-quote"
                                     }, [],
                            "a", { rel: "nofollow"
                                 , href: "javascript:;"
                                 , textContent: "Quote"
                                 }, [],
                            "a", { className: "go_top"
                                 , href: "#"
                                 , textContent: "^"
                                 }, []
                        ]
                    ]
                ]
            ]
        ])
}

// stylePreview :: Elem -> IO ()
function stylePreview(e) {
    log("stylePreview!")

    e.textContent = ""
    var posts = getPosts()

    for (var i = 0; i < posts.length; i++) {
        posts[i].sig = JSON.stringify(load())
        style(e, posts[i])
    }

    log(posts)
}

// }}}

// {{{ Easy GUI

// | Create a user friendly CSS editing GUI.
// easygui :: IO ()
function easygui() {
    localStorage["coup-z-choice"] = "1"
    var g = speedcore("table", { id: "coup-z-simple" }, [
        "thead", {}, [
            "tr", {}, [
                "th", { colSpan: "3", textContent: "Simple editing" }, []
            ]
        ],
        "tbody", {}, [
            "tr", {}, [
                "td", { textContent: "Avatar opacity" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "Number between 0.0 - 1.0" }, []
            ],
            "tr", {}, [
                "td", { textContent: "Header background color" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "red, #ff0000, rgba(255,0,0,0.3), transparent, …" }, []
            ],
            "tr", {}, [
                "td", { textContent: "Post background image" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "http://link.to/image.png, //pls.love/me.gif, …" }, []
            ],
            "tr", {}, [
                "td", { textContent: "Post background color" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "red, #ff0000, rgba(255,0,0,0.3), transparent, …" }, []
            ],
            "tr", {}, [
                "td", { textContent: "Post background positions" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "12px 30px, 40% 30%, left/right/center top/bottom/center, …" }, []
            ],
            "tr", {}, [
                "td", { textContent: "Post background attachments" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "fixed, scroll, local" }, []
            ],
            "tr", {}, [
                "td", { textContent: "Post background repeat" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "no-repeat, repeat-x, repeat-y, repeat" }, []
            ],
            "tr", {}, [
                "td", { textContent: "Post background size" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "auto 30px, 40% 12px, auto auto, …" }, []
            ],
            "tr", {}, [
                "td", { textContent: "Post font" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "Comic Sans MS, Papyrus, …" }, []
            ],
            "tr", {}, [
                "td", { textContent: "Post font color" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "red, #ff0000, rgba(255,0,0,0.3), transparent, …" }, []
            ],
            "tr", {}, [
                "td", { textContent: "Post link color" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "red, #ff0000, rgba(255,0,0,0.3), transparent, …" }, []
            ],
            "tr", {}, [
                "td", { textContent: "Username color" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "red, #ff0000, rgba(255,0,0,0.3), transparent, …" }, []
            ],
            "tr", {}, [
                "td", { textContent: "Username shadow color" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "red, #ff0000, rgba(255,0,0,0.3), transparent, …" }, []
            ],
            "tr", {}, [
                "td", { textContent: "Username background image" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "http://link.to/image.png, //pls.love/me.gif, …" }, []
            ],
            "tr", {}, [
                "td", { textContent: "Post shadow color" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "red, #ff0000, rgba(255,0,0,0.3), transparent, …" }, []
            ],
            "tr", {}, [
                "td", { textContent: "Quote header background color" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "red, #ff0000, rgba(255,0,0,0.3), transparent, …" }, []
            ],
            "tr", {}, [
                "td", { textContent: "Quote background color" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "red, #ff0000, rgba(255,0,0,0.3), transparent, …" }, []
            ],
            "tr", {}, [
                "td", { textContent: "Quote font color" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "red, #ff0000, rgba(255,0,0,0.3), transparent, …" }, []
            ],
            "tr", {}, [
                "td", { textContent: "Button background color" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "red, #ff0000, rgba(255,0,0,0.3), transparent, …" }, []
            ],
            "tr", {}, [
                "td", { textContent: "Button font color" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "red, #ff0000, rgba(255,0,0,0.3), transparent, …" }, []
            ],
            "tr", {}, [
                "td", { textContent: "Button border color" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "red, #ff0000, rgba(255,0,0,0.3), transparent, …" }, []
            ],
            "tr", {}, [
                "td", { textContent: "Button padding" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "4px, 1%, …" }, []
            ],
            "tr", {}, [
                "td", { textContent: "Button margin" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "4px, 1%, …" }, []
            ],
//            "tr", {}, [
//                "td", { textContent: "Footer background images" }, [],
//                "td", {}, [
//                    "input", { style: { width: "300px" }}, []
//                ],
//                "td", { textContent: "http://link.to/image.png, //pls.love/me.gif, …" }, []
//            ],
            "tr", {}, [
                "td", { textContent: "Footer background color" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "red, #ff0000, rgba(255,0,0,0.3), transparent, …" }, []
            ],
            "tr", {}, [
                "td", { textContent: "UserInfo background image" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "http://link.to/image.png, //pls.love/me.gif, …" }, []
            ],
            "tr", {}, [
                "td", { textContent: "UserInfo background position" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "12px 30px, 40% 30%, left/right/center top/bottom/center, …" }, []
            ],
            "tr", {}, [
                "td", { textContent: "UserInfo background attachments" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "fixed, scroll, local" }, []
            ],
            "tr", {}, [
                "td", { textContent: "UserInfo background repeat" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "no-repeat, repeat-x, repeat-y, repeat" }, []
            ],
            "tr", {}, [
                "td", { textContent: "UserInfo background size" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "auto 30px, 40% 12px, auto auto, …" }, []
            ],
            "tr", {}, [
                "td", { textContent: "UserInfo background color" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "red, #ff0000, rgba(255,0,0,0.3), transparent, …" }, []
            ],
            "tr", {}, [
                "td", { textContent: "Warnings visibility" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "hidden, visible, collapse" }, []
            ],
            "tr", {}, [
                "td", { textContent: "UsertitleImage visibility" }, [],
                "td", {}, [
                    "input", { style: { width: "300px" }}, []
                ],
                "td", { textContent: "hidden, visible, collapse" }, []
            ]
        ]
    ])
    var user = username()
    var path = window.location.pathname.split('/')[1]
    var url = '/' + path + "/profile/" + user.id + '/'

    var e = document.getElementById("coup-z-wrap")
    var pre = preview(user.name, url)
    var prew = speedcore("div", { id: "coup-z-preview" }, [])
    var see = elemStyle()

    prew.appendChild(pre)

    e.innerHTML = ""
    e.appendChild(g)
    e.appendChild(prew)
    e.appendChild(back())

    var ps = [ [ "Avatar", "id", "opacity", "%s" ]
             , [ "Header", "id", "background-color", "%s" ]
             , [ "Post", "id", "background-image"
               , "url(\"%s\")", /url\("|"\)/ig
               ]
             , [ "Post", "id", "background-color", "%s" ]
             , [ "Post", "id", "background-position", "%s"  ]
             , [ "Post", "id", "background-attachment", "%s" ]
             , [ "Post", "id", "background-repeat", "%s" ]
             , [ "Post", "id", "background-size", "%s" ]
             , [ "Post", "id", "font-family", "%s" ]
             , [ "Post", "id", "color", "%s" ]
             , [ "Urls", "id", "color", "%s" ]
             , [ "Username", "id", "color", "%s" ]
             , [ "Username", "id", "text-shadow", "0 0 3px %s"
               , /\d+(%|px|pt)?|\s/g
               ]
             , [ "Username", "id", "background"
               , "url(\"%s\") top left no-repeat"
               ]
             , [ "Post", "id", "text-shadow", "0 0 1px %s", /0 0 1px / ]
             , [ "QuoteHeader", "id", "background-color", "%s" ]
             , [ "Quote", "id", "background-color", "%s" ]
             , [ "Quote", "id", "color", "%s" ]
             , [ "Button", "id", "background-color", "%s" ]
             , [ "Button", "id", "color", "%s" ]
             , [ "Button", "id", "border", "1px solid %s", /1px solid / ]
             , [ "Button", "id", "padding", "2px %s", /2px / ]
             , [ "Button", "id", "margin", "2px %s", /2px / ]
//             , [ "Footer", "id", "background-image"
//               , "url(\"%s\")", /url\("|"\)/ig
//               ]
             , [ "Footer", "id", "background-color", "%s" ]
             , [ "UserInfo", "id", "background-image"
               , "url(\"%s\")", /url\("|"\)/ig
               ]
             , [ "UserInfo", "id", "background-position", "%s"  ]
             , [ "UserInfo", "id", "background-attachment", "%s" ]
             , [ "UserInfo", "id", "background-repeat", "%s" ]
             , [ "UserInfo", "id", "background-size", "%s" ]
             , [ "UserInfo", "id", "background-color", "%s" ]
             , [ "Warnings", "id", "visibility", "%s" ]
             , [ "UsertitleImage", "id", "visibility", "%s" ]
             ]
    var is = g.getElementsByTagName("input")

    for (var i = 0; i < ps.length; i++) {
        is[i].addEventListener("blur", function(j){ return function(_){
            log("This is jay: " + j)
            if (ps[j].length > 4)
                this.value = this.value.replace(ps[j][4], '')

            log(this.value)

            var xs = map(function(x){ return x.trim() }, this.value.split(','))
            var vs = map(function(x){ return ps[j][3].replace(/%s/g, x) }, xs)
            var v = vs.join(', ')

            log([xs, vs, v, ps[j][3]])

            save(ps[j][0], ps[j][1], ps[j][2], v)
            stylePreview(see)

        }}(i))

        update(ps[i][0], ps[i][1], ps[i][2], is[i])

        if (ps[i].length > 4)
            is[i].value = is[i].value.replace(ps[i][4], '')
    }

    stylePreview(see)
}

// }}}

// {{{ Editing

// | Change the `src' attribute of the element.
// changeSrc :: Event -> IO ()
function changeSrc(e) {
    var x = prompt("Image URL")

    if (x !== "" && x !== null) {
        this.src = x
        this.style = "max-width:170px; max-height:170px; cursor:pointer;"
        localStorage["coup-z-avatar"] = x
    }
}

// | Change the user's nickname.
// changeNick :: Event -> IO ()
function changeNick(e) {
    e.preventDefault()

    var x = prompt("Nickname")

    if (x !== null && ! x.match(/^\s+$/)) {
        this.textContent = x
        editSignature(function(o) {
            o.Nick = x

            return o
        })

    } else if (x !== "") {
        this.textContent = username().name
        editSignature(function(o) {
            delete o.Nick

            return o
        })
    }

    return false
}

// changeText :: Event -> IO ()
function changeText(e) {
    e.preventDefault()

    var x = prompt("Text")

    if (x !== null) {
        this.textContent = x
    }
}

// editSignature :: (Obj -> Obj) -> IO Obj
function editSignature(f) {
    var e = document.getElementById("c_post").getElementsByTagName("textarea")[0]
    var json = e.textContent.substr(8)
    json = json.substr(0, json.length - 9)

    var obj
    try { obj = JSON.parse(json) }
    catch (e) { obj = {} }
    var tmp = f(obj)

    e.textContent = "[nocode]" + JSON.stringify(tmp) + "[/nocode]"

    return tmp
}

// load :: IO Obj
function load() {
    return editSignature(id)
}

// | Save the current object in the siganture textarea.
// save :: String -> String -> String -> String -> IO ()
function save(e, s, p, v) {
    editSignature(function(o){
        o = safeObj(o, e, {})
        o[e] = safeObj(o[e], s, {})

        if (v === "") delete o[e][s][p]
        else o[e][s][p] = v

        log(o)

        return o
    })
}

// | Update the value input with the potentially stored value.
// update :: String -> String -> String -> Elem -> IO ()
function update(e, s, p, el) {
    var obj = safeObj(load(), e, {})
    obj[e] = safeObj(obj[e], s, {})
    obj[e][s] = safeObj(obj[e][s], p, "")
    el.value = obj[e][s][p]
}

// | Get a value from the localStorage with a fallback value if it doesn't
//   exist.
// get :: String -> a -> a
function get(k, a) {
    if (localStorage[k] !== undefined && localStorage[k] !== null)
        return localStorage[k]

    else return a
}

// }}}

// {{{ Advanced GUI

// | Create the CSS editing GUI.
// gui :: IO ()
function gui() {
    localStorage["coup-z-choice"] = "0"
    var editor = speedcore("table", { id: "coup-z-editor" }, [
        "tbody", {}, [
            "tr", {}, []
        ]
    ])

    var user = username()
    var path = window.location.pathname.split('/')[1]
    var url = '/' + path + "/profile/" + user.id + '/'

    var dom = selector(doms, function(e, a){ selectUpdate() })
    var sub = selector(subs, function(e, a){ selectUpdate() })
    var pro = selector(props, function(e, a){ selectUpdate() })
    var inp = document.createElement("input")
    var hlp = document.createElement("span")
    var pre = preview(user.name, url)
    var prew = speedcore("div", { id: "coup-z-preview" }, [])
    var e = document.getElementById("coup-z-wrap")
    var see = elemStyle()

    inp.id = "coup-z-input"

    inp.addEventListener("blur", function(_){
        var v = this.value
        var xs = selectors()
        var p = selected(xs[2]).textContent
        var s = selected(xs[1]).textContent
        var e = selected(xs[0]).textContent

//        if (["Backgrounds", "Header", "Footer"].indexOf(e) === -1
//        || ["background", "background-image"].indexOf(p) === -1) {
        if (true) {
            save(e, s, p, v)
            stylePreview(see)

        } else {
            flash(this, "darkRed")
            setTimeout(function() {
                alert( "You can't edit post, header or footer background "
                     + "images! Thanks Obama, Chrome and Steve Jobs."
                     )
            }, 1100)
        }
    })

    editor.children[0].children[0].appendChild(td(dom))
    editor.children[0].children[0].appendChild(td(sub))
    editor.children[0].children[0].appendChild(td(pro))
    editor.children[0].children[0].appendChild(td(inp))
    editor.children[0].children[0].appendChild(td(hlp))

    prew.appendChild(pre)

    e.innerHTML = ""
    e.appendChild(editor)
    e.appendChild(prew)
    e.appendChild(back())

    stylePreview(see)
}

// selector :: (String, a) -> ((String, a) -> IO ()) -> IO ()
function selector(xs, f) {
    var sel = document.createElement("select")
    for (var e in xs) {
        var opt = document.createElement("option")
        opt.textContent = e
        sel.appendChild(opt)
    }
    sel.addEventListener("change", function(_){
        var e = this.children[this.selectedIndex].textContent
        f(e, xs[e])
    })

    return sel
}

// selectors :: IO [Elem]
function selectors() {
    return document.getElementById("coup-z-editor").getElementsByTagName("select")
}

// selectUpdate :: IO ()
function selectUpdate() {
    var xs = selectors()
    var p = selected(xs[2]).textContent
    var s = selected(xs[1]).textContent
    var e = selected(xs[0]).textContent
    var el = document.getElementById("coup-z-input")

    update(e, s, p, el)
}

// }}}

// {{{ High octave sexual moaning

// replacer :: String -> String
function replacer(x){
    for (var k in embeds) {
        log("Embeds: " + k)
        var m = x.match(RegExp(embeds[k].u, 'g'))

        if (m) log(m.toString())
        x = x.replace(RegExp(embeds[k].u, 'g'), embeds[k].e)
    }

    return x
}

// high :: Elem -> IO ()
function high(e){
    var as = e.getElementsByTagName("a")

    // each link
    for (var j = 0; j < as.length; j++)
        log("Links #" + j + " / " + as.length)
        try {
            log(as)
            var ass = as[j]
            var rd = replacer(ass.href)

            if (rd !== ass.href) ass.outerHTML = rd

        } catch(e) {
            log(e.toString())
        }
}

// octave :: IO ()
function octave(){
    log("High octave sexual moaning")
    var xs = document.getElementsByClassName("c_post")

    // Each post
    for (var i = 0; i < xs.length; i++) {
        (function (ii) {
            high(xs[ii])
        })(i)
    }
}

// }}}

// {{{ Smart pinned

// fadeElem :: Elem -> Int -> Int -> Int -> String -> ()
function fadeElem(e, b, s, t, d) {
    var n = b
    var loop = setInterval(function() {
        log("e o = " + n)
        e.style.opacity = n
        n += s

        if (b > t ? n <= t : n >= t) {
            e.style.display = d
            clearInterval(loop)
        }
    }, 1000 / 60)
}

// hidePinned :: Elem -> Bool -> IO ()
function hidePinned(pin, fade) {
    var id = pin.href.split('=')[1]
    var n = parseInt(pin.textContent.replace(/,/g, ""))
    var json

    try {
        json = JSON.parse(localStorage["SmartPinned"])

    } catch(e) {
        json = {}
    }

    if (id in json) {
        if (json[id] >= n) {
            if (fade) fadeElem(pin.parentNode.parentNode, 1, -1 / 20, 0, "none")

            else pin.parentNode.parentNode.style.display = "none"

            log("id " + id + " > n")
            log(json[id] + " > " + n)
        }

    } else json[id] = n

    localStorage["SmartPinned"] = JSON.stringify(json)
}

// smartPinned :: IO ()
function smartPinned() {
    log("Smart pinned!")

    var pins = document.querySelectorAll(".pin .c_cat-replies a")
    var ph = document.querySelector("#pinned_head")
    var btn = document.createElement("input")
    btn.type = "button"
    btn.value = ph.textContent
    ph.textContent = ""
    ph.appendChild(btn)

    btn.addEventListener("click", function(e) {
        if (localStorage["SmartPinnedDisabled"]) {
            for (var i = 0; i < pins.length; i++) hidePinned(pins[i], true)
            delete localStorage["SmartPinnedDisabled"]

        } else {
            for (var i = 0; i < pins.length; i++) {
                fadeElem(pins[i].parentNode.parentNode, 0, 1 / 20, 1, "")
            }
            localStorage["SmartPinnedDisabled"] = 1
        }
    })

    var pino = new MutationObserver(function(ms){
            if (ms.length > 0) {

                var pins = document.querySelectorAll(".pin .c_cat-replies a")

                if (! localStorage["SmartPinnedDisabled"]) {
                    for (var i = 0; i < pins.length; i++) hidePinned(pins[i])
                }
            }
    })

    var ops = { subtree: true, childList: true, attributes: false }

    pino.observe(document.querySelector("#main"), ops)

    for (var i = 0; i < pins.length; i++) {
        if (! localStorage["SmartPinnedDisabled"]) hidePinned(pins[i])

        pins[i].parentNode.parentNode.style.cursor = "pointer"
        pins[i].parentNode.parentNode.addEventListener("click", function(e) {
            e.stopPropagation()

            if (! localStorage["SmartPinnedDisabled"])
                fadeElem(this, 1, -1 / 20, 0, "none")

            var pin = this.querySelector(".c_cat-replies a")
            var id = pin.href.split('=')[1]
            var n = parseInt(pin.textContent.replace(/,/g, ""))

            try {
                json = JSON.parse(localStorage["SmartPinned"])

            } catch(e) {
                json = {}
            }

            json[id] = n

            localStorage["SmartPinned"] = JSON.stringify(json)
        })
    }
}

// }}}

// {{{ Welcome

// sigInit :: IO ()
function sigInit(){
    var e = document.getElementById("main")
    var s = document.getElementById("edit_sig")
    var b = last(s.getElementsByTagName("button"))
    var rc = document.createElement("button")

    b.textContent = "Save Coup"
    rc.textContent = "Reset Coup"
    rc.style = "margin: 0px 10px"

    rc.addEventListener("click", function(_) {
        _.preventDefault()
        editSignature(function(_){ return {} })

        return false
    })

    b.parentNode.appendChild(rc)
    e.appendChild(speedcore("div", { id: "coup-z-wrap" }, []))
}

// choice :: IO ()
function choice(){
    var b = localStorage["coup-z-choice"]
    if (b === "0") gui()
    else if (b === "1") easygui()
    else welcome()
}

// welcome :: IO ()
function welcome(){
    var d = speedcore("div", { id: "coup-z-welcome"
                             , style: { margin: "30px auto"
                                      , width: "420px"
                                      }
                             }, [
        "div", { style: { display: "table-cell"
                        , padding: "0 10px 0 0"
                        , color: "white"
                        , textShadow: "0 0 1px black, 0 0 1px black"
                        , textAlign: "right"
                        , cursor: "pointer"
                        , fontSize: "39px"
                        , minWidth: "200px"
                        }
               , textContent: "Simple"
               , onclick: easygui
               }, [],
        "div", { style: { display: "table-cell"
                        , borderLeft: "1px solid"
                        , boxShadow: "0 0 4px black, 0 0 4px black"
                        }
               }, [],
        "div", { style: { display: "table-cell"
                        , padding: "0 0 0 10px"
                        , color: "white"
                        , textShadow: "0 0 1px black, 0 0 1px black"
                        , textAlign: "left"
                        , cursor: "pointer"
                        , fontSize: "39px"
                        , minWidth: "200px"
                        }
               , textContent: "Advanced"
               , onclick: gui
               }, []
    ])
    var n = speedcore("div", {}, [
        "span", { textContent: "Disable Coup-Z" }, [],
        "input", { type: "checkbox"
                 , onclick: toggle
                 , checked: localStorage["coup-z-disabled"]
                 }, []
    ])
    var e = document.getElementById("coup-z-wrap")

    e.innerHTML = ""
    e.appendChild(d)
    e.appendChild(n)
}

// toggle :: Event -> IO ()
function toggle(_){
    if (this.checked) localStorage["coup-z-disabled"] = "true"
    else delete localStorage["coup-z-disabled"]
}

// | The back-to-welcome button.
// back :: IO Elem
function back(){
    var b = speedcore("input", { value: "← Coup menu"
                               , type: "button"
                               , onclick: welcome
                               , style: { cursor: "pointer"
                                        , margin: "10px"
                                        }
                               }, []
    )

    return b
}

// }}}

// main :: IO ()
function main() {
    var off = localStorage["coup-z-disabled"] ? true : false

    if (isThread()) octave()

    if ((isThread() || isSingle()) && ! off) {
        log("Thread or single")

        var posts = getPosts()
        var postlen = posts.length
        var e = elemStyle()

        for (var i = 0; i < posts.length; i++) {
            style(e, posts[i])
        }

        log(posts)

        var stylo = new MutationObserver(function(ms){
                if (ms.length > 0) {
                    log(ms.toString())
                    posts = getPosts()

                    for (var i = postlen; i < posts.length; i++) {
                        style(e, posts[i])
                    }

                    postlen = posts.length
                }
        })

        var ops = { subtree: true, childList: true, attributes: false }

        stylo.observe(document.querySelector("#topic_viewer"), ops)

    } else if (isThread() && off) {
        var sty = document.createElement("style")
        // Hide signatures
        //sty.textContent =
            //"tr[id^=\"post-\"] + tr + tr > td.c_sig { display: none !important }"
        document.body.appendChild(sty)

        var posts = getPosts()
        var postlen = posts.length

        hideSigs(posts)

        var sigo = new MutationObserver(function(ms){
                if (ms.length > 0) {
                    posts = getPosts()

                    hideSigs(slice.call(posts, postlen, posts.length))

                    postlen = posts.length
                }
        })

        var ops = { subtree: true, childList: true, attributes: false }

        sigo.observe(document.querySelector("#topic_viewer"), ops)

    } else if (isSig()) {
        log("Signature")
        sigInit()
        choice()

    } else if (isForum()) {
        smartPinned()
    }
}

main()

