/*jslint nomen: true, indent: 2, maxerr: 3 */
/*global window, rJS, RSVP, Autolinker, YT, JSON, loopEventListener */
(function (window, rJS, RSVP, Autolinker, YT, JSON, loopEventListener) {
  "use strict";

  // https://github.com/boramalper/Essential-YouTube
  // https://developers.google.com/youtube/iframe_api_reference
  // https://developers.google.com/youtube/player_parameters?playerVersion=HTML5
  // https://getmdl.io/components/index.html

  /////////////////////////////
  // parameters
  /////////////////////////////
  var API_KEY = "AIzaSyD_ZX5na0fPbcLbO5sZ2hWD-FxR-Xd2_TM";
  var DEFAULT_VIDEO_ID = 'WFxPkhLNrcc';
  var DELAY = 500;
  var SLIDER_INTERVAL = 500;
  var SCROLL_TRIGGER = 300;

  /////////////////////////////
  // templates
  /////////////////////////////
  var FIRST_ENTRY_TEMPLATE = "" +
    '<li class="mdl-list__item">' +
       '<div class="mdl-card mdl-shadow--2dp">' +
         '<div class="mdl-card__title">' +
           '<h3 class="mdl-card__title-text" data-action="next">Next</h3>' +
         '</div>' +
         '<div class="mdl-card__menu entry-icon-spacing">' +
           '<form>' +
            '<button type="submit" class="mdl-button mdl-button--icon mdl-js-button" data-action="up" data-position="{pos}" disabled>' +
              '<i class="material-icons">arrow_upward</i>' +
            '</button>' +
          '</form>' +
          '<form>' +
             '<button type="submit" class="mdl-button mdl-button--icon mdl-js-button" data-action="down" data-position="{pos}" title="Move downwards in queue">' +
               '<i class="material-icons">arrow_downward</i>' +
             '</button>' +
           '</form>' +
           '<form>' +
             '<button type="submit" class="mdl-button mdl-button--icon mdl-js-button" data-action="remove" data-position="{pos}" title="Remove from queue">' +
               '<i class="material-icons">remove</i>' +
             '</button>' +
            '</form>' +
         '</div>' +
         '<div class="entry-details">' +
           '<div>' +
              '<form>' +
                '<button type="submit" class="entry-details-button" data-action="next">' +
                  '<img src="{thumbnail_url}" alt="">' +
                '</button>' +
              '</form>' +
           '</div>' +
           '<div class="mdl-card__supporting-text">' +
             '{title}' +
           '</div>' +
         '</div>' +
       '</div>' +
     '</li>';

    var CONSECUTIVE_ENTRY_TEMPLATE = "" +
      '<li class="mdl-list__item">' +
        '<div class="mdl-card mdl-shadow--2dp">' +
          '<div class="mdl-card__supporting-text">' +
            '{title}' +
          '</div>' +
          '<div class="mdl-card__menu entry-icon-spacing">' +
            '<form>' +
              '<button type="submit" class="mdl-button mdl-button--icon mdl-js-button" data-action="up" data-position="{pos}" title="Move upwards in queue">' +
                '<i class="material-icons">arrow_upward</i>' +
              '</button>' +
            '</form>' +
            '<form>' +
              '<button type="submit" class="mdl-button mdl-button--icon mdl-js-button" data-action="down" data-position="{pos}" title="Move downwards in queue" {isDisabled}>' +
                '<i class="material-icons">arrow_downward</i>' +
              '</button>' +
            '</form>' +
            '<form>' +
              '<button type="submit" class="mdl-button mdl-button--icon mdl-js-button" data-action="remove" data-position="{pos}" title="Remove from queue">' +
                '<i class="material-icons">remove</i>' +
              '</button>' +
            '</form>' +
          '</div>' +
        '</div>' +
      '</li>';

  var SEARCH_RESULT_TEMPLATE = "" +
    '<li class="mdl-list__item">' +
      '<div class="mdl-card mdl-shadow--2dp">' +
        '<div class="mdl-card__title">' +
          '<h3 class="mdl-card__title-text" data-video="{video_id}">{title}</h3>' +
        '</div>' +
        '<div class="mdl-card__menu">' +
            '<form>' +
              '<button type="submit" data-video="{video_id}" class="mdl-button mdl-button--icon mdl-js-button" title="Add to queue">' +
                '<i class="material-icons">playlist_add</i>' +
              '</button>' +
            '</form>' +
        '</div>' +
        '<div class="entry-details">' +
          '<div>' +
            '<form>' +
              '<button class="entry-details-button" type="submit" data-video="{video_id}" data-action="play">' +
                '<img src="{thumbnail_url}" alt="">' +
              '</button>' +
            '</form>' +
          '</div>' +
          '<div class="mdl-card__supporting-text">' +
            '{description}' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</li>';

  /////////////////////////////
  // some methods
  /////////////////////////////
  function getUrlParameter(name, url) {
    return decodeURIComponent(
      (new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)')
        .exec(url)||[,""])[1].replace(/\+/g, '%20')) || null;
  }
  
  function uuid() {
    function S4() {
      return ('0000' + Math.floor(
        Math.random() * 0x10000
      ).toString(16)).slice(-4);
    }
    return S4() + S4() + "-" +
      S4() + "-" +
      S4() + "-" +
      S4() + "-" +
      S4() + S4() + S4();
  }

  function setState() {
    var state = uuid();
    window.sessionStorage.setItem("state", state);
    return state;
  }

  function getState() {
    return window.sessionStorage.getItem("state");
  }

  function assessDependenciesLoaded(dict) {
    return YT && YT.loaded && dict.materialized.MaterialProgress !== undefined;
  }

  function showDialog(element, name) {
    var dialog = element.querySelector("dialog");
    //if (!dialog.showModal) {
    //  dialogPolyfill.registerDialog(dialog);
    //}
    dialog.showModal();
  }
  
  function hideDialog(element, name) {
    var dialog = element.querySelector("dialog");
    dialog.close();
  }

  // http://javascript.crockford.com/remedial.html
  if (!String.prototype.supplant) {
    String.prototype.supplant = function (o) {
      return this.replace(
        /\{([^{}]*)\}/g,
        function (a, b) {
          var r = o[b];
          return typeof r === 'string' || typeof r === 'number' ? r : a;
        }
      );
    };
  }

  // http://stackoverflow.com/a/25209563
  function parseDuration(duration) {
    var matches = duration.match(/[0-9]+[HMS]/g),
      seconds = 0;

    matches.forEach(function (part) {
      var unit = part.charAt(part.length-1),
        amount = parseInt(part.slice(0,-1), 10);
  
        switch (unit) {
          case 'H':
            seconds += amount * 60 * 60;
            break;
          case 'M':
            seconds += amount * 60;
            break;
          case 'S':
            seconds += amount;
            break;
          default:
        }
      });
      return seconds;
  }

  rJS(window)

    /////////////////////////////
    // state
    /////////////////////////////
    .setState({
      init: null,
      state: "watching",
      video_duration: null,
      last_key_stroke: null,
      previous_state: null,
      next_page_token: null,
      slider_in_use: false,
      is_searching: false,
    })

    /////////////////////////////
    // ready
    /////////////////////////////
    .ready(function () {
      var gadget = this;

      gadget.property_dict = {
        materialized: gadget.element.querySelector("#like-dislike"),
        search_result_dict: {},
        video_queue: [],
        player: null,
        autolinker: new Autolinker({mention: false, hashtag: false})
      };

      return new RSVP.Queue()
        .push(function () {
          return gadget.initializeDropboxConnection();
        })
        .push(function () {
          return gadget.checkState();
        });
    })

    /////////////////////////////
    // acquired methods
    /////////////////////////////
    .declareAcquiredMethod('jio_create', 'jio_create')
    .declareAcquiredMethod('jio_put', 'jio_put')
    .declareAcquiredMethod('jio_get', 'jio_get')
    
    
    /////////////////////////////
    // published methods
    /////////////////////////////

    /////////////////////////////
    // declared methods
    /////////////////////////////
    .declareMethod("getDropboxConnection", function (url, name, config) {
      return new Promise(function (resolve, reject) {
        var popup_resolver = function resolver(href) {
          var test = getUrlParameter("state", href);

          // already logged in
          if (test && getState() === test) {
            window.sessionStorage.setItem("state", null);
            resolve({
              "access_token": getUrlParameter("access_token", href),
              "uid": getUrlParameter("uid", href),
              "type": getUrlParameter("token_type", href)
            });
          } else {
            reject("forbidden - state parameter does not match.");
          }
        };
  
        return new RSVP.Queue()
          .push(function () {
            return window.open(url, name, config);
          })
          .push(function (my_opened_window) {
            my_opened_window.opener.popup_resolver = popup_resolver;
            return;
          });
      });
    })

    .declareMethod("setDropboxConnection", function () {
      var gadget = this;

      return new RSVP.Queue()
        .push(function () {
          return gadget.getDropboxConnection(
            "https://www.dropbox.com/1/oauth2/authorize?" +
              "client_id=rz2ua0dyty5lxx7" +
              "&response_type=token" +
              "&state=" + setState() +
              "&redirect_uri=" + window.location.href,
            "",
            "width=480,height=480,resizable=yes,scrollbars=yes,status=yes"
          );
        })
        .push(function (oauth_dict) {
          gadget.jio_create({
            "type": "dropbox",
            "access_token": oauth_dict.access_token,
            "root": "auto"
          });
          return gadget.jio_get("/test/");
        })
        .push(undefined, function (error) {
          console.log(error)
          if (error.target.status === 404) {
            return gadget.jio_put("/test/", {});          
          }
          throw error;
        });
    })

    .declareMethod("initializeDropboxConnection", function () {

      // the oauth popup will open same page and we will end up at this line, too,
      // but when inside the popup, the opener must be set
      if (window.opener === null) {
        return;
      }
      return new RSVP.Queue()
        .push(function () {
          
          // window.opener returns reference to  window that opened this window
          //https://developer.mozilla.org/en-US/docs/Web/API/Window/opener
          return window.opener.popup_resolver(
            window.location.hash.replace("#", "?")
          );
        })
        .push(function () {
          window.close();
          return;
        });
    })

    .declareMethod("videoOnStateChange", function () {
      var gadget = this,
        element = gadget.element,
        player = gadget.property_dict.player,
        current_state = player.getPlayerState(), 
        button = document.getElementById("play-pause"),
        jump_to_next = null;

      if (current_state === YT.PlayerState.ENDED) {
        if (document.getElementById("loopSwitch").checked) {
          player.seekTo(0, true);
          player.playVideo();
        } else {
          button.innerHTML = '<i class="material-icons">play_arrow</i>';
          jump_to_next = true;
        }
      } else if (current_state === YT.PlayerState.PLAYING) {
        button.innerHTML = '<i class="material-icons">pause</i>';
      } else {
        button.innerHTML = '<i class="material-icons">play_arrow</i>';
      }

      if (jump_to_next) {
        return gadget.nextVideo();
      }
    })

    .declareMethod("changeVideo", function (video_id) {
      window.location.hash = video_id;  
    })

    .declareMethod("nextVideo", function () {
      var gadget = this,
        dict = gadget.property_dict;
      if (dict.video_queue.length) {
        return new RSVP.Queue()
          .push(function () {
            return gadget.changeVideo(dict.video_queue.shift().id.videoId);
          })
          .push(function () {
            return gadget.refreshQueue();
          });
      }
      dict.player.stopVideo();
      return gadget.updateSlider();
    })
    
    .declareMethod("updateSlider", function () {
      var gadget = this,
        dict = gadget.property_dict,
        slider;

      if (gadget.state.slider_in_use) {
        return;
      }
      slider = document.getElementById("slider");
      slider.MaterialSlider.change(dict.player.getCurrentTime());
    })

    .declareMethod("refreshQueue", function () {
      var gadget = this,
        element = gadget.element,
        video_queue = gadget.property_dict.video_queue,
        queue_list = element.querySelector("#queue"),
        len = video_queue.length,
        i;

      // delete all entries
      while (queue_list.lastChild) {
        queue_list.removeChild(queue_list.lastChild);
      }

      // create first entry
      if (len > 0) {
        queue_list.innerHTML = FIRST_ENTRY_TEMPLATE.supplant({
          "title": video_queue[0].snippet.title,
          "thumbnail_url": video_queue[0].snippet.thumbnails.high.url,
          "pos": 0
        });
      }

      // create rest of the entries
      for (i = 1; i < len; ++i) {
        queue_list.innerHTML += CONSECUTIVE_ENTRY_TEMPLATE.supplant({
          "title": video_queue[i].snippet.title,
          "pos": i,
          "isDisabled": i == len - 1 ? "disabled" : ""
        });
      }
    })

    .declareMethod("loadVideo", function (video_id) {
      var gadget = this,
        element = gadget.element,
        player = gadget.property_dict.player,
        page_content = element.querySelector(".page-content");

      // destroying and creating is tricky with async
      if (player && player.getPlayerState) {
        gadget.property_dict.player.destroy();
      }
      
      gadget.property_dict.player = new YT.Player('player', {
        videoId: video_id,
        width: page_content.clientWidth,
        height: page_content.clientWidth * 9 / 16,
        events: {'onReady': function (event) {
          event.target.playVideo();
        }},
        playerVars: { 
          autohide: 1,
          showinfo: 0,
          disablekb: 1,
          iv_load_policy: 3,
          rel: 0
        }
      });

      return new RSVP.Queue()
        .push(function () {
          return jIO.util.ajax({
            "url": "https://www.googleapis.com/youtube/v3/videos?" +
              "part=snippet,statistics,contentDetails" +
              "&id=" + video_id + 
              "&key=" + API_KEY
          });
        })
        .push(function (result) {
          var response = JSON.parse(result.target.responseText),
            video_title = element.querySelector("#video-title"),
            video_desc = element.querySelector("#video-desc"),
            view_count = element.querySelector("#view-count"),
            item = response.items[0],
            likes,
            dislikes,
            tab_title,
            slider;

          video_title.textContent = item.snippet.title;
          video_desc.innerHTML = gadget.property_dict.autolinker.link(
            response.items[0].snippet.description.split("\n").join("<br>")
          );
          view_count.textContent =
            parseInt(item.statistics.viewCount, 10).toLocaleString();
  
          likes = parseInt(item.statistics.likeCount, 10);
          dislikes = parseInt(item.statistics.dislikeCount, 10);
          
          element.querySelector("#like-dislike").MaterialProgress.setProgress(
            likes * 100 / (likes + dislikes)
          );
  
          tab_title = document.getElementsByTagName("title")[0];
          tab_title.textContent = response.items[0].snippet.title;
          slider = document.getElementById("slider");
          slider.setAttribute("max", parseDuration(item.contentDetails.duration));
          slider.value = 0;
        })
        .push(undefined, function (error) {
          throw error;
        });
    })

    .declareMethod("enterSearch", function () {
      var gadget = this;
      if (gadget.state.state === "searching") {
        return;
      }
      return gadget.changeState({"state": "searching"});
    })

    .declareMethod("exitSearch", function () {
      var gadget = this;
      if (gadget.state.state === "watching") {
        return;
      }
      return gadget.changeState({"state": "watching"});
    })

    .declareMethod("refreshSearchResults", function () {
      var gadget = this,
        catalog = gadget.property_dict.search_result_dict,
        response = "",
        item_id,
        item;

      for (item_id in catalog) {
        if (catalog.hasOwnProperty(item_id)) {
          item = catalog[item_id];
          response += SEARCH_RESULT_TEMPLATE.supplant({
            "video_id": item.id.videoId,
            "title": item.snippet.title,
            "thumbnail_url": item.snippet.thumbnails.high.url,
            "description": gadget.property_dict.autolinker.link(item.snippet.description)
          });
        }
      }
      gadget.element.querySelector("#search-results").innerHTML = response;
    })

    .declareMethod("triggerSearch", function (event) {
      var gadget = this;
      if (event.target.value.length === 0) {
        return gadget.exitSearch();
      }
      return new RSVP.Queue()
        .push(function () {
          return RSVP.all([
            gadget.enterSearch(),
            gadget.changeState({"last_key_stroke": new Date().getTime()}),
            RSVP.delay(DELAY)
          ]);
        })
        .push(function() {
          return gadget.runSearch();
        });
    })

    .declareMethod("runSearch", function (no_delay, next_page) {
      var gadget = this,
        dict = gadget.property_dict,
        state = gadget.state,
        time = new Date().getTime();
      
      if (!no_delay && time - state.last_key_stroke < DELAY) {
        return;
      }
      if (state.is_searching) {
        return;
      }

      // unless we're adding more results, blank our index
      if (!next_page) {
        dict.search_result_dict = {};
      }

      return new RSVP.Queue()
        .push(function () {
          return gadget.changeState({"is_searching": true});
        })
        .push(function () {
          var search_input = gadget.element.querySelector("#search"),
            token = '';

          if (next_page && gadget.state.next_page_token) {
            token = '&pageToken=' + gadget.state.next_page_token;
          }

          return jIO.util.ajax({
            "url": "https://www.googleapis.com/youtube/v3/search?" +
              "part=snippet" +
              "&q=" + encodeURIComponent(search_input.value) + 
              "&type=video" +
              "&maxResults=10" +
              "&key=" + API_KEY +
              token
          });
        })
        .push(function (result) {
          var response = JSON.parse(result.target.responseText),
            len = response.items.length,
            item,
            i;
          for (i = 0; i < len; ++i) {
            item = response.items[i];
            dict.search_result_dict[item.id.videoId] = item;
          }
          return RSVP.all([
            gadget.refreshSearchResults(),
            gadget.changeState({"next_page_token": response.nextPageToken}),
            gadget.changeState({"is_searching": false})
          ]);
        })
        /*
        .push(function () {
          if (!next_page) {
            dict.search_result_dict = {};
          }
          return gadget.changeState({"is_searching": false});
        })
        */
        .push(undefined, function (error) {
          return gadget.changeState({"is_searching": false});
        });
    })
    
    .declareMethod("addToQueue", function (video_id) {
      var gadget = this,
        dict = gadget.property_dict;
      if (dict.search_result_dict.hasOwnProperty(video_id)) {      
        dict.video_queue.push(dict.search_result_dict[video_id]);
      }
      return gadget.refreshQueue();
    })

    /////////////////////////////
    // on state changes
    /////////////////////////////
    .onStateChange(function (modification_dict) {
      var gadget = this,
        player_container,
        controllers,
        video_info,
        search_results;
      
      if (modification_dict.hasOwnProperty("state")) {
        player_container = document.getElementById("player-container");
        controllers = document.getElementById("controllers");
        video_info = document.getElementById("info");
        search_results = document.getElementById("search-results");
          
        if (modification_dict.state === "searching") {
          player_container.classList.add("hidden");
          controllers.classList.remove("hidden");
          video_info.classList.add("hidden");
          search_results.classList.remove("hidden");
        } else {
          search_results.classList.add("hidden");
          controllers.classList.add("hidden");
          player_container.classList.remove("hidden");
          video_info.classList.remove("hidden");
        }
      }      
      
    })

    /////////////////////////////
    // on Event
    /////////////////////////////
    .onEvent("submit", function (event) {
      var gadget = this,
        dict = gadget.property_dict,
        form_name = event.target.getAttribute("name"),
        element = gadget.element,
        submit_button = event.target.querySelector("button"),
        video_id,
        position_id,
        i,
        action;

      if (submit_button) {
        video_id = submit_button.getAttribute("data-video");
        action = submit_button.getAttribute("data-action");
        if (video_id) {
          if (action === "play") {
            return RSVP.all([
              gadget.exitSearch(),
              gadget.changeVideo(video_id)
            ]);  
          }
          return gadget.addToQueue(video_id);
        }

        if (action) {
          position_id = submit_button.getAttribute("data-position");
          switch (action) {
            case "up":
              i = parseInt(position_id, 10);
              dict.video_queue.splice(i - 1, 0, dict.video_queue.splice(i, 1)[0]);
              return gadget.refreshQueue();
            case "down":
              i = parseInt(position_id, 10);
              dict.video_queue.splice(i + 1, 0, dict.video_queue.splice(i, 1)[0]);
              return gadget.refreshQueue();
            case "remove":
              i = parseInt(position_id, 10);
              dict.video_queue.splice(i, 1);
              return gadget.refreshQueue();
            case "next":
              return gadget.nextVideo();
          }
        }
      }

      switch (event.target.getAttribute("name")) {
        case "frube-play-pause":
          if (dict.player.getPlayerState() === YT.PlayerState.PLAYING) {
            dict.player.pauseVideo();
          } else {
            dict.player.playVideo();
          }
          break;
        case "frube-exit-search":
          return gadget.exitSearch();
        case "frube-next-video":
          return gadget.nextVideo();
        case "frube-set-volume":
          if (dict.player.isMuted()) {
            submit_button.innerHTML = '<i class="material-icons">volume_up</i>';
            dict.player.unMute();
          } else {
            dict.player.mute();
            submit_button.innerHTML = '<i class="material-icons">volume_off</i>';
          }
          break;
        case "frube-homerun":
          element.getElementsByTagName("main")[0].scrollTop = 0;
          break;
        case "frube-close-dialog":
          hideDialog(element, "frube");
          break;
        case "frube-search-source":
          return new RSVP.Queue()
            .push(function () {
              return gadget.enterSearch();
            })
            .push(function () {
              return gadget.runSearch(true);
            });
      }
    }, false, true)
    
    .onEvent("input", function (event) {
      var gadget = this;
      switch (event.target.getAttribute("name")) {
        case "frube-search-input":
          return gadget.triggerSearch(event);
      }
    }, false, false)
    
    .onEvent("change", function (event) {
      var gadget = this,
        is_slider = event.target.id === "slider";
      if (is_slider) {
        gadget.property_dict.player.seekTo(event.target.value, true);
      }
    }, false, false)
    
    .onEvent("mouseDown", function (event) {
      var gadget = this,
        is_slider = event.target.id === "slider";
      if (is_slider) {
        return gadget.changeState({"slider_in_use": true});
      }
    }, false, false)
    
    .onEvent("mouseUp", function (event) {
      var gadget = this,
        is_slider = event.target.id === "slider";
      if (is_slider) {
        return gadget.changeState({"slider_in_use": false});
      }
    }, false, false)

    .onEvent("click", function (event) {
      var gadget = this,
        promise_list = [],
        video_id = event.target.getAttribute("data-video"),
        action = event.target.getAttribute("data-action");

      switch (event.target.getAttribute("name")) {
        case "frube-open-dialog":
          showDialog(gadget.element, "frube");
          break;
        case "frube-connector-dropbox":
          return gadget.setDropboxConnection();
        case "frube-search-input":
          if (event.target.value.length) {
            promise_list.push(gadget.enterSearch());
          
            if (Object.keys(gadget.property_dict.search_result_dict).length) {
              promise_list.push(gadget.refreshSearchResults());
            } else {
              promise_list.push(gadget.runSearch(true));
            }
          }
      }

      if (action) {
        promise_list.push(gadget.nextVideo());
      }

      if (video_id) {
        promise_list.push(gadget.exitSearch());
        promise_list.push(gadget.changeVideo(video_id));
      }

      return RSVP.all(promise_list);
    }, false, false)

    /////////////////////////////
    // declared jobs
    /////////////////////////////
    .declareJob("playFirstVideo", function () {
      var gadget = this,
        video_id = window.location.hash.slice(1, 1 + 11);
  
      if (video_id.length === 11) {
        return gadget.loadVideo(video_id);
      }
      return gadget.changeVideo(DEFAULT_VIDEO_ID);
    })

    .declareJob("checkState", function () {
      var gadget = this,
        queue = new RSVP.Queue(),
        dict = gadget.property_dict,
        current_state;

      // wait until YT and MDL have loaded 
      if (assessDependenciesLoaded(dict) && !gadget.state.init) {
        queue.push(function () {
          return RSVP.all([
            gadget.playFirstVideo(),
            gadget.changeState({"init": 1})
          ]);
        });
      }

      // set flag whether a player is active, issues is it takes time to 
      // create and destroy the player so this whole checkstate loop plus
      // this logic could be wrapped into a single simple loop
      if (dict.player && dict.player.getPlayerState) {
        current_state = dict.player.getPlayerState();
        queue.push(gadget.updateSlider());
      }

      return queue
        .push(function () {
          return RSVP.delay(50);
        })
        .push(function () {
          // check for a new player state every 50ms
          // http://stackoverflow.com/a/17078152/4466589
          // https://stackoverflow.com/questions/17078094/youtube-iframe-player-api-onstatechange-not-firing
          if ((current_state || current_state === 0) && current_state !== gadget.state.previous_state) {
            return RSVP.all([
              gadget.videoOnStateChange(),
              gadget.changeState({"previous_state": current_state})
            ]);
          }
          return gadget.changeState({"previous_state": current_state});
        })
        .push(function () {
          return gadget.checkState();
        });
    })

    /////////////////////////////
    // declared service
    /////////////////////////////
    .declareService(function () {
      var gadget = this,
        main = gadget.element.querySelector("main");

      function handleHash() {
        var video_id = window.location.hash.slice(1, 1 + 11);
        if (video_id.length === 11) {
          return gadget.loadVideo(video_id);
        }
      }

      function handleScroll(event) {
        var main = event.target,
          state = gadget.state.state,
          pos = main.scrollTop + main.clientHeight + SCROLL_TRIGGER;

        if (state === "searching" && pos >= main.scrollHeight) {
          return gadget.runSearch(true, true);
        }
      }

      return RSVP.all([
        loopEventListener(window, "hashchange", false, handleHash),
        loopEventListener(main, "scroll", false, handleScroll)
      ]);
    });

}(window, rJS, RSVP, Autolinker, YT, JSON, loopEventListener));

