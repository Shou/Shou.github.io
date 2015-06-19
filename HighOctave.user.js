// ==UserScript==
// @name            High Octave Sexual Moaning
// @description     Embed SoundCloud and other media sites and files on Zetaboards
// @version         1.0
// @include         http*://*.zetaboards.com/*
// @author          Shou
// @copyright       2015, Shou
// @license         GPL-3
// ==/UserScript==
 
 
function log(x) {
    console.log("Octave -- " + x)
}
 
// | No more Flydom!
// speedcore :: String -> Obj -> Tree -> Elem
function speedcore(tagname, attrs, childs) {
    var e = document.createElement(tagname)
 
    for (k in attrs){
        if (typeof attrs[k] === "object")
            for (l in attrs[k])
                e[k][l] = attrs[k][l]
 
        else e[k] = attrs[k]
    }
 
    for (var i = 0; i < childs.length; i = i + 3) {
        var el = speedcore( childs[i]
                          , childs[i + 1]
                          , childs[i + 2]
                          )
        e.appendChild(el)
    }
 
    return e
}
 
// XXX removing vine script might cause unwanted behavior
// TODO account for video and audio ?GET=attributes
var embeds =
    { "vimeo":
        { u: "https?:\\/\\/vimeo\\.com\\/(\\S+)"
        , e: function(url) {
                return speedcore("iframe", { src: url
                                           , width: 640
                                           , height: 380
                                           , frameborder: 0
                                           , webkitallowfullscreen: true
                                           , mozallowfullscreen: true
                                           , allowfullscreen: true
                                           }, [])
             }
        , s: "//player.vimeo.com/video/$1"
        }
    , "soundcloud":
        { u: "(https?:\\/\\/soundcloud\\.com\\/\\S+)"
        , e: function(url) {
                return speedcore("iframe", { src: url
                                           , width: "100%"
                                           , height: 166
                                           , scrolling: "no"
                                           , frameborder: "no"
                                           }, [])
             }
        , s: "https://w.soundcloud.com/player/?url=$1"
        }
    , "audio":
        { u: "(https?:\\/\\/\\S+?\\.(mp3|ogg))$"
        , e: function(url) {
                return speedcore("audio", { src: url
                                          , controls: true
                                          , width: 320
                                          , height: 32
                                          }, [])
             }
        , s: "$1"
        }
    , "video":
        { u: "(https?:\\/\\/\\S+?\\.(ogv|webm|mp4))"
        , e: function(url) {
                return speedcore("video", { src: url
                                          , controls: true
                                          , style: { maxWidth: "640px" }
                                          }, [])
             }
        , s: "$1"
        }
    , "vine":
        { u: "https?:\\/\\/vine.co\\/v\\/([a-zA-Z0-9]+)"
        , e: function(url) {
                return speedcore("iframe", { src: url
                                           , className: "vine-embed"
                                           , width: 480
                                           , height: 480
                                           , frameborder: 0
                                           }, [])
             }
        , s: "https://vine.co/v/$1/embed/simple"
        }
    }
 
// replacer :: String -> Either Null Elem
function replacer(x){
    var e = null
 
    for (var k in embeds) {
        var r = RegExp(embeds[k].u, 'g')
        var m = x.match(r)
 
        if (m) {
            e = embeds[k].e(x.replace(r, embeds[k].s))
        }
    }
 
    return e
}
 
// high :: Elem -> IO ()
function high(e){
    var as = e.getElementsByTagName("a")
 
    // each link
    for (var j = 0; j < as.length; j++) {
        try {
            if (as[j].href !== as[j].textContent) continue

            var ass = as[j]
              , ene = replacer(ass.href)
 
            if (ene) {
                log("ene.tagName: " + ene.tagName)
 
                if (ene.tagName === "VIDEO") {
                    ene.addEventListener("loadeddata", function(e) {
                        log("moz: " + this.mozHasAudio)
                        log("webkit: " + this.webkitAudioDecodedByteCount)
                        var hasAudio = this.mozHasAudio === undefined
                                     ? this.webkitAudioDecodedByteCount > 0
                                     : this.mozHasAudio
                        log("has audio? " + hasAudio)
 
                        if (! hasAudio) {
                            log("Looping and muting")
                            this.loop = true
                            this.muted = true
                            this.controls = false
 
                            this.style.cursor = "pointer"
                            this.dataset.desc = "Toggle play"
 
                            this.addEventListener("click", function(e) {
                                if (this.paused) this.play()
                                else this.pause()
                            })
 
                            this.play()
                            log("Added looping and muting")
                        }
                    })
                }
 
                log("Replacing link with object")
                ass.parentNode.replaceChild(ene, ass)
            }
 
        } catch(e) {
            log(e.toString())
        }
    }
}
 
// octave :: IO ()
function octave(){
    log("High octave sexual moaning")
    var xs = document.getElementsByClassName("c_post")
 
    // Each post
    for (var i = 0; i < xs.length; i++) {
        (function (ii){
            high(xs[ii])
        })(i)
    }
}
 
octave()
