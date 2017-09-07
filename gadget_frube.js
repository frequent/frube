/*jslint nomen: true, indent: 2, maxerr: 3 */
/*global window, rJS, jIO, RSVP, YT, JSON, loopEventListener */
(function (window, rJS, jIO, RSVP, YT, JSON, loopEventListener) {
  "use strict";

  // KUDOS: https://github.com/boramalper/Essential-YouTube
  // https://developers.google.com/youtube/iframe_api_reference
  // https://developers.google.com/youtube/player_parameters?playerVersion=HTML5
  // https://getmdl.io/components/index.html

  /////////////////////////////
  // some parameters
  /////////////////////////////
  var TEMPLATE_SELECTOR = "script[type='text/x-supplant-template']";

  /////////////////////////////
  // some methods
  /////////////////////////////
  function buildTemplateDict(my_template_dict) {
    var template_list = window.document.querySelectorAll(TEMPLATE_SELECTOR),
      len = template_list.length,
      template,
      i;
    for (i = 0; i < len; i += 1) {
      template = template_list[i];
      my_template_dict[template.id] = template.textContent;
    }
    return my_template_dict;
  }

  function mergeDict(my_return_dict, my_new_dict) {
    var param;
    for (param in my_new_dict) {
      if (my_new_dict.hasOwnProperty(param)) {
        my_return_dict[param] = my_new_dict[param];
      }
    }
    return my_return_dict;
  }

  function getTimeStamp() {
    return new window.Date().getTime();
  }

  function getVideoId() {
    return window.location.hash.slice(1, 1 + 11);
  }

  function setTitle(my_title) {
    window.document.title = my_title;
  }

  function showDialog(my_element, my_selector) {
    var dialog = my_element.querySelector(my_selector);
    //// XXX crossbrowser support!
    //if (!dialog.showModal) {
    //  dialogPolyfill.registerDialog(dialog);
    //}
    dialog.showModal();
  }

  function hideDialog(my_element, my_selector) {
    var dialog = my_element.querySelector(my_selector);
    dialog.close();
  }

  function setVolume(my_player, my_event) {
    var button_icon = my_event.target.querySelector("button i");
    if (my_player.isMuted()) {
      button_icon.textContent = "volume_up";
      my_player.unMute();
    } else {
      my_player.mute();
      button_icon.textContent = "volume_off";
    }
  }

  function playOrPause(my_player) {
    if (my_player.getPlayerState() === YT.PlayerState.PLAYING) {
      my_player.pauseVideo();
    } else {
      my_player.playVideo();
    }   
  }

  function anyAttribute(my_element) {
    return my_element.getAttribute("data-video") ||
      my_element.getAttribute("data-action") ||
        my_element.getAttribute("name");
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
      scroll_trigger: 300,
      scroll_buffer: 250,
      search_buffer: 500,
      slider_interval: 500,
      mode: "watching",
      search_time: null,
      video_duration: null,
      last_key_stroke: null,
      last_main_pos: 0,
      next_page_token: null,
      slider_in_use: false,
      is_searching: false,
    })

    /////////////////////////////
    // ready
    /////////////////////////////
    .ready(function () {
      var gadget = this,
        element = gadget.element;

      gadget.property_dict = {
        search_result_dict: {},
        video_queue: [],
        player: null,

        page_content: element.querySelector(".frube-page-content"),
        video_like: element.querySelector(".frube-like"),
        video_slider: element.querySelector(".frube-slider"),
        video_title: element.querySelector(".frube-video-title"),
        video_count: element.querySelector(".frube-video-count"),
        sync_button: element.querySelector(".frube-btn-sync"),
        search_results: element.querySelector(".frube-search-results"),
        player_container: element.querySelector(".frube-player-container"),
        player_controller: element.querySelector(".frube-player-controller"),
      };

      gadget.template_dict = buildTemplateDict({});

      //return gadget.checkState();
    })

    /////////////////////////////
    // acquired methods
    /////////////////////////////
    .declareAcquiredMethod('frube_create', 'frube_create')
    .declareAcquiredMethod('frube_repair', 'frube_repair')
    .declareAcquiredMethod('frube_put', 'frube_put')
    .declareAcquiredMethod('tube_create', 'tube_create')
    .declareAcquiredMethod('tube_allDocs', 'tube_allDocs')
    .declareAcquiredMethod('tube_get', 'tube_get')

    /////////////////////////////
    // published methods
    /////////////////////////////

    /////////////////////////////
    // declared methods
    /////////////////////////////
    .declareMethod("render", function (my_option_dict) {
      var gadget = this,
        dict = gadget.property_dict;

      // ensure material design is applied to injected DOM
      window.componentHandler.upgradeDom();
      mergeDict(dict, my_option_dict);

      return new RSVP.Queue()
        .push(function () {
          return RSVP.all([
            gadget.tube_create({"type": "youtube", "api_key": dict.youtube_id}),
            gadget.frube_create({"type": "indexeddb", "database": "frube"})
          ]);
        })
        .push(function () {
          return gadget.playFirstVideo();
        });        
    })

    .declareMethod("changeVideo", function (video_id) {
      var gadget = this;
      if (!video_id) {
        return;
      }
      return new RSVP.Queue()
        .push(function () {
          return gadget.exitSearch();
        })
        .push(function () {
          window.location.hash = video_id;
        });  
    })

    .declareMethod("loadVideo", function (my_video_id) {
      var gadget = this,
        dict = gadget.property_dict,
        element = gadget.element,
        player = dict.player,
        page_content = dict.page_content;

      // destroying and creating is tricky with async
      if (player && player.getPlayerState) {
        gadget.property_dict.player.destroy();
      }

      gadget.property_dict.player = new YT.Player('player', {
        videoId: my_video_id,
        width: page_content.clientWidth,
        height: Math.max(page_content.clientWidth * 0.66 * 9 / 16, 250),
        events: {
          'onReady': function (event) {
            event.target.playVideo();
          },
          'onStateChange': function (event) {
            return gadget.videoOnStateChange();
          }
        },
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
          return gadget.tube_get(my_video_id);
        })
        .push(function (my_response) {
          var item = my_response.items[0],
            likes = parseInt(item.statistics.likeCount, 10),
            dislikes = parseInt(item.statistics.dislikeCount, 10);

          setTitle(item.snippet.title);
          dict.video_title.textContent = item.snippet.title;
          dict.video_count.textContent =
            parseInt(item.statistics.viewCount, 10).toLocaleString();
          dict.video_like.MaterialProgress.setProgress(
            likes * 100 / (likes + dislikes)
          );
          dict.video_slider.setAttribute(
            "max",
            parseDuration(item.contentDetails.duration)
          );
          dict.video_slider.value = 0;
        });
    })

    .declareMethod("videoOnStateChange", function () {
      var gadget = this,
        player = gadget.property_dict.player,
        current_state = player.getPlayerState(), 
        play_icon = gadget.element.querySelector(".frube-btn-play-pause i"),
        jump_to_next = null;

      if (current_state === YT.PlayerState.ENDED) {
        if (gadget.element.querySelector(".frube-btn-repeat").checked) {
          player.seekTo(0, true);
          player.playVideo();
        } else {
          play_icon.textContent = "play_arrow";
          jump_to_next = true;
        }
      } else if (current_state === YT.PlayerState.PLAYING) {
        play_icon.textContent = "pause";
      } else {
        play_icon.textContent = "play_arrow";
      }

      if (jump_to_next) {
        return gadget.nextVideo();
      }
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

    .declareMethod("handleAction", function (my_event) {
      var gadget = this,
        dict = gadget.property_dict,
        button = my_event.target.querySelector("button"),
        pos = button.getAttribute("data-position"),
        attr = anyAttribute(button),
        i;

      switch (attr) {
        case "up":
          i = parseInt(pos, 10);
          dict.video_queue.splice(i - 1, 0, dict.video_queue.splice(i, 1)[0]);
          return gadget.refreshQueue();
        case "down":
          i = parseInt(pos, 10);
          dict.video_queue.splice(i + 1, 0, dict.video_queue.splice(i, 1)[0]);
          return gadget.refreshQueue();
        case "remove":
          i = parseInt(pos, 10);
          dict.video_queue.splice(i, 1);
          return gadget.refreshQueue();
        case "next":
          return gadget.nextVideo();
        case "play":
          return gadget.changeVideo(button.getAttribute("data-video"));
        // phusing it a bit
        // case "add":
        default:
          return gadget.addToSelection(button.getAttribute("data-video"));
          //return gadget.addToQueue(button.getAttribute("data-video"));
      }
    })

    .declareMethod("updateSlider", function () {
      var gadget = this,
        state = gadget.state,
        player = gadget.property_dict.player,
        slider = gadget.element.querySelector(".frube-slider");

      if (state.slider_in_use || !slider.MaterialSlider) {
        return;
      }
      slider.MaterialSlider.change(player.getCurrentTime());
    })

    .declareMethod("connectAndSyncWithDropbox", function(my_event) {
      var gadget = this,
        dict = gadget.property_dict;

      return new RSVP.Queue()
        .push(function () {
          return gadget.getDeclaredGadget("dropbox");
        })
        .push(function (my_dropbox_gadget) {
          return my_dropbox_gadget.setDropboxConnect(dict.dropbox_id);
        })
        .push(function (my_ouath_dict) {
          return gadget.frube_create({
            "type": "replicate",
            "check_local_modification": true,
            "check_local_creation": true,
            "check_local_deletion": true,
            "local_sub_storage": {
              "type": "query",
              "sub_storage": {
                "type": "indexeddb",
                "database": "frube"
              }
            },
            "remote_sub_storage": {
              "type": "query",
              "sub_storage": {
                "type": "drivetojiomapping",
                "sub_storage": {
                  "type": "dropbox",
                  "access_token": my_ouath_dict.access_token,
                  "root": "sandbox"
                }
              }
            }
          });
        })
        .push(function () {
          my_event.target.querySelector("i").textContent = "done";
          dict.sync_button.querySelector("i").textContent = "sync";
          return gadget.frube_repair();
        });
    })

    .declareMethod("refreshSearch", function (my_event) {
      var gadget = this,
        promise_list = [];

      if (my_event.target.value.length) {
        promise_list.push(gadget.enterSearch());
          
        if (Object.keys(gadget.property_dict.search_result_dict).length) {
          promise_list.push(gadget.refreshSearchResults());
        } else {
          promise_list.push(gadget.runSearch(true));
        }
      }
      return RSVP.all(promise_list);
    })

    .declareMethod("enterSearch", function () {
      var gadget = this;
      if (gadget.state.mode === "searching") {
        return;
      }
      return gadget.changeState({"mode": "searching"});
    })

    .declareMethod("exitSearch", function () {
      var gadget = this;
      if (gadget.state.mode === "watching") {
        return;
      }
      return gadget.changeState({"mode": "watching"});
    })

    .declareMethod("triggerSearchFromScroll", function (my_event) {
      var gadget = this,
        state = gadget.state,
        main = event.target,
        main_pos = main.scrollTop,
        height_trigger,
        sec_trigger;

      if (state.mode === "searching") {
        if (main_pos >= state.last_main_pos) {
          return new RSVP.Queue()
            .push(function () {
              return gadget.changeState({"last_main_pos": main_pos});
            })
            .push(function () {
              height_trigger = main_pos + main.clientHeight + state.scroll_trigger;
              if (height_trigger >= main.scrollHeight) {
                sec_trigger = getTimeStamp() - state.search_time > state.scroll_buffer;

                if (!state.is_searching && sec_trigger) {
                  return RSVP.all([
                    gadget.enterSearch(),
                    gadget.runSearch(true, true)
                  ]);
                }

              }
            });
        }      
      }
    })

    .declareMethod("triggerSearchFromInput", function (event) {
      var gadget = this;

      if (event.target.value.length === 0) {
        return gadget.exitSearch();
      }

      return new RSVP.Queue()
        .push(function () {
          return RSVP.all([
            gadget.enterSearch(),
            gadget.changeState({"last_key_stroke": getTimeStamp()}),
            RSVP.delay(gadget.state.search_buffer)
          ]);
        })
        .push(function() {
          return gadget.runSearch();
        });
    })

    .declareMethod("runSearch", function (my_no_delay, my_next_page) {
      var gadget = this,
        dict = gadget.property_dict,
        state = gadget.state,
        time = getTimeStamp();

      if (!my_no_delay && time - state.last_key_stroke < state.search_buffer) {
        return gadget.changeState({"is_searching": false});
      }
      if (state.is_searching) {
        return gadget.changeState({"is_searching": false});
      }

      // unless we're adding more results, blank our index
      if (!my_next_page) {
        dict.search_result_dict = {};
      }

      return new RSVP.Queue()
        .push(function () {
          return gadget.enterSearch();
        })
        .push(function () {
          return gadget.changeState({
            "is_searching": true,
            "search_time": time
          });
        })
        .push(function () {
          var search_input = gadget.element.querySelector(".frube-search-input"),
            token = "";

          if (my_next_page && gadget.state.next_page_token) {
            token = gadget.state.next_page_token;
          }

          return gadget.tube_allDocs({
            "query": search_input.value,
            "token": token
          });
        })  
        .push(function (response) {
          var item,
            i;

          if (response.data.total_rows > 0) {
            response.nextPageToken = response.data.rows.nextPageToken;
          }
          for (i = 0; i < response.data.total_rows; i += 1) {
            item = response.data.rows[i];
            dict.search_result_dict[item.id.videoId] = item;
          }
          return RSVP.all([
            gadget.refreshSearchResults(),
            gadget.changeState({"next_page_token": response.nextPageToken}),
            gadget.changeState({"is_searching": false})
          ]);
        })
        .push(undefined, function (error) {
          return new RSVP.Queue()
            .push(function () {
              return gadget.changeState({"is_searching": false});
            })
            // XXX can't throw from here and requests fail often with 403
            //.push(function () {
            //  throw error;
            //});
        });
    })

    .declareMethod("refreshQueue", function () {
      var gadget = this,
        element = gadget.element,
        temp = gadget.template_dict,
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
        queue_list.innerHTML = temp.first_entry_template.supplant({
          "title": video_queue[0].snippet.title,
          "thumbnail_url": video_queue[0].snippet.thumbnails.high.url,
          "pos": 0
        });
      }

      // create rest of the entries
      for (i = 1; i < len; ++i) {
        queue_list.innerHTML += temp.consecutive_entry_template.supplant({
          "title": video_queue[i].snippet.title,
          "pos": i,
          "isDisabled": i == len - 1 ? "disabled" : ""
        });
      }
    })

    .declareMethod("addToSelection", function (video_id) {
      var gadget = this,
        dict = gadget.property_dict;
        console.log("HEARYE, HEARYE")
        console.log(dict.search_result_dict[video_id]);
        
      /*
      id.videoId
      id.kind youtube#video
      title       => original title
      thumbnails.high.url
      use_artist
      use_title
      use_thumbnail
      timestamp? => how to rank from new to old
      trendups
      trenddown
      */
    })    

    .declareMethod("addToQueue", function (video_id) {
      var gadget = this,
        dict = gadget.property_dict;
      if (dict.search_result_dict.hasOwnProperty(video_id)) {      
        dict.video_queue.push(dict.search_result_dict[video_id]);
      }
      return gadget.refreshQueue();
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
          response += gadget.template_dict.search_entry_template.supplant({
            "video_id": item.id.videoId,
            "title": item.snippet.title,
            "thumbnail_url": item.snippet.thumbnails.high.url,
          });
        }
      }
      gadget.element.querySelector(".frube-search-results").innerHTML = response;
    })

    /////////////////////////////
    // declared jobs
    /////////////////////////////
    .declareJob("playFirstVideo", function () {
      var gadget = this,
        video_id = getVideoId();

      if (video_id.length === 11) {
        return gadget.loadVideo(video_id);
      }
      return gadget.changeVideo(gadget.property_dict.youtube_default_video);
    })

    // onLoop broken
    .declareJob("loopSlider", function () {
      var gadget = this;
      return new RSVP.Queue()
        .push(function () {
          return RSVP.delay(gadget.state.slider_interval);
        })
        .push(function () {
          return gadget.updateSlider();
        })
        .push(function () {
          return gadget.loopSlider();
        });
    })

    /////////////////////////////
    // declared service
    /////////////////////////////
    .declareService(function () {
      var gadget = this,
        main = gadget.element.querySelector("main");

      function handleHash() {
        var video_id = getVideoId();
        if (video_id.length === 11) {
          return gadget.loadVideo(video_id);
        }
      }

      function handleScroll(event) {
        return gadget.triggerSearchFromScroll(event);
      }

      return RSVP.all([
        loopEventListener(window, "hashchange", false, handleHash),
        loopEventListener(main, "scroll", false, handleScroll)
      ]);
    })

    /////////////////////////////
    // on state changes
    /////////////////////////////
    .onStateChange(function (modification_dict) {
      var gadget = this,
        dict = gadget.property_dict;

      if (modification_dict.hasOwnProperty("mode")) {
        if (modification_dict.mode === "searching") {
          dict.player_container.classList.add("hidden");
          dict.player_controller.classList.remove("hidden");
          dict.search_results.classList.remove("hidden");
        } else {
          dict.search_results.classList.add("hidden");
          dict.player_controller.classList.add("hidden");
          dict.player_container.classList.remove("hidden");
        }
      }
    })

    /////////////////////////////
    // on Event
    /////////////////////////////
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

    .onEvent("input", function (event) {
      var gadget = this;

      switch (event.target.getAttribute("name")) {
        case "frube-search-input":
          return gadget.triggerSearchFromInput(event);
      }
    }, false, false)

    .onEvent("click", function (event) {
      var gadget = this,
        attr = anyAttribute(event.target);
      
      switch (attr) {
        case "frube-connector-dropbox":
          return gadget.connectAndSyncWithDropbox(event);
        case "frube-dialog-configure-close":
          hideDialog(gadget.element, ".frube-configure");
          break;
        case "frube-search-input":
          return gadget.refreshSearch(event);
        case "next":
          return gadget.nextVideo();
        default:
          return gadget.changeVideo(attr);
      }
    }, false, false)

    .onEvent("submit", function (event) {
      var gadget = this,
        attr = anyAttribute(event.target);
      
      switch (attr) {
        case "frube-dialog-configure-set":
          return;
        case "frube-home":
          gadget.element.getElementsByTagName("main")[0].scrollTop = 0;
          break;
        case "frube-dialog-configure-open":
          showDialog(gadget.element, ".frube-configure");
          break;
        case "frube-dialog-about-close":
          hideDialog(gadget.element, ".frube-about");
          break;
        case "frube-dialog-about-open":
          showDialog(gadget.element, ".frube-about");
          break;
        case "frube-exit-search":
          return gadget.exitSearch();
        case "frube-next-video":
          return gadget.nextVideo();
        case "frube-search-source":
          return gadget.runSearch(true);
        case "frube-play-pause":
          playOrPause(gadget.property_dict.player);
          break;
        case "frube-set-volume":
          setVolume(gadget.property_dict.player, event);
          break;

        // form without an attribute MUST have a submit button with data-action
        default:
          return gadget.handleAction(event);
      }
    }, false, true);

}(window, rJS, jIO, RSVP, YT, JSON, loopEventListener));
