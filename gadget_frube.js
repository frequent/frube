/*jslint nomen: true, indent: 2, maxerr: 3 */
/*global window, rJS, jIO, RSVP, YT, JSON, loopEventListener */
(function (window, rJS, jIO, RSVP, YT, JSON, loopEventListener) {
  "use strict";

  // KUDOS: https://github.com/boramalper/Essential-YouTube
  // https://developers.google.com/youtube/iframe_api_reference
  // https://developers.google.com/youtube/player_parameters?playerVersion=HTML5
  // https://getmdl.io/components/index.html

  // XXX queue_list is cheap - include in storage definition
  // XXX route through state change

  /////////////////////////////
  // parameters
  /////////////////////////////
  var TEMPLATE_SELECTOR = "script[type='text/x-supplant-template']";
  var ARR = [];
  var STR = '';
  var POSITION = 'data-position';
  var SECTION = 'section';
  var BUTTON = 'button';
  var BUTTON_I = 'button i';
  var VIDEO = 'data-video';
  var OVERLAY = 'frube-overlay';
  var DELETED = 'frube-video-deleted';
  var DISABLED = 'disabled';
  var MINUS = '-';

  /////////////////////////////
  // methods
  /////////////////////////////
  function makeList(nodeList) {
    return ARR.slice.call(nodeList);
  }

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

  function setVideoHash(my_video_id) {
    window.location.hash = my_video_id;
  }

  function getVideoHash() {
    var id = window.location.hash.slice(1, 1 + 11);
    if (id.length === 11) {
      return id;
    }
  }

  function getVideoId(my_arr, my_current_id, my_shift) {
    var len = my_arr.length,
      i;
    for (i = 0; i < len; i += 1) {
      if (my_arr.id === my_current_id) {
        return my_arr[i + my_shift];
      }
    }
  }
  
  function getId(my_event) {
    return my_event.target.querySelector(BUTTON).getAttribute(VIDEO);
  }

  function getPos(my_event) {
    return my_event.target.querySelector(BUTTON).getAttribute(POSITION);
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

  function setVideo(my_element, my_class_flag) {
    my_element.classList.add(OVERLAY, my_class_flag);
  }

  function getVideo(my_element, my_video_id) {
    my_element.querySelector('div[data-video=" + my_video_id + "]');
  }

  function setTitle(my_title) {
    window.document.title = my_title;
  }

  function setDom(my_node, my_string, my_purge) {
    var faux_element = document.createElement(SECTION);

    if (my_purge) {
      while (my_node.firstChild) {
        my_node.removeChild(my_node.firstChild);
      }
    }

    faux_element.innerHTML = my_string;
    makeList(faux_element.children).forEach(function (element) {
      my_node.appendChild(element);
    });
  }

  function setViewsSlider(my_element, my_stats) {
    var likes = parseInt(my_stats.likeCount, 10),
      dislikes = parseInt(my_stats.dislikeCount, 10);

    window.componentHandler.upgradeDom();
    my_element.MaterialProgress.setProgress(likes * 100 / (likes + dislikes));
  }

  function setVideoSlider(my_element, my_stats) {
    my_element.setAttribute("max", parseDuration(my_stats.duration));
    my_element.value = 0;
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

  //https://stackoverflow.com/a/4760279  
  function dynamicSort(prop) {
    var sortOrder = 1;
    if (prop[0] === MINUS) {
      sortOrder = -1;
      prop = prop.substr(1);
    }
    return function (a, b) {
      var result = (a[prop] < b[prop]) ? -1 : (a[prop] > b[prop]) ? 1 : 0;
      return result * sortOrder;
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

  function setButtonIcon(my_element, my_icon) {
    my_element.querySelector(BUTTON_I).textContent = my_icon;
  }

  function setArtistAndTitle(my_item) {
    return [
      my_item.custom_artist || my_item.original_artist,
      my_item.custom_title || my_item.original_title
    ].filter(Boolean).join(" - ");
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

  function getDataUri(url) {
    return new RSVP.Promise(function (resolve, reject) {
      var image = new Image();
      image.onload = function () {
        var canvas = window.document.createElement("canvas");
        canvas.width = this.naturalWidth;
        canvas.height = this.naturalHeight;
        canvas.getContext('2d').drawImage(this, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      image.onerror = function () {
        return "nope"; 
      };
      image.src = url;
    });
  }

  function fetchAndConvertImage(my_item) {
    return new RSVP.Queue()
      .push(function () {
        return getDataUri(my_item.snippet.thumbnails.medium.url);
      })
      .push(function (my_event) {
        my_item.snippet.thumbnails.medium.base64 = my_event.target.result;
        return my_item;
      });
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
      play: null
    })

    /////////////////////////////
    // ready
    /////////////////////////////
    .ready(function () {
      var gadget = this,
        element = gadget.element;

      gadget.property_dict = {
        search_result_dict: {},
        queue_list: [],
        player: null,
        page_content: element.querySelector(".frube-page-content"),
        video_info: element.querySelector(".frube-video-info"),
        video_slider: element.querySelector(".frube-slider"),
        sync_button: element.querySelector(".frube-btn-sync"),
        search_results: element.querySelector(".frube-search-results"),
        playlist: element.querySelector(".frube-playlist-results"),
        player_container: element.querySelector(".frube-player-container"),
        player_controller: element.querySelector(".frube-player-controller"),
      };

      gadget.template_dict = buildTemplateDict({});
    })

    /////////////////////////////
    // acquired methods
    /////////////////////////////
    .declareAcquiredMethod('frube_create', 'frube_create')
    .declareAcquiredMethod('frube_repair', 'frube_repair')
    .declareAcquiredMethod('frube_allDocs', 'frube_allDocs')
    .declareAcquiredMethod('frube_put', 'frube_put')
    .declareAcquiredMethod('frube_get', 'frube_get')
    .declareAcquiredMethod('frube_remove', 'frube_remove')
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
          var video_id = getVideoHash();
          if (video_id) {
            return gadget.loadVideo(video_id);
          }
          return gadget.changeState({"play": dict.default_video});
        })
        .push(function () {
          return gadget.refreshPlaylist();
        });        
    })

    .declareMethod("removeVideo", function (my_video_id) {
      var gadget = this;
      return new RSVP.Queue()
        .push(function () {
          return gadget.frube_remove(my_video_id);
        })
        .push(function () {
          setVideo(getVideo(gadget.element, my_video_id), DELETED);
        });
    })

    .declareMethod("loadVideo", function (my_video_id) {
      var gadget = this,
        dict = gadget.property_dict,
        temp = gadget.template_dict,
        element = gadget.element,
        player = dict.player,
        info = dict.video_info,
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
          var item = dict.search_result_dict[my_video_id] = my_response.items[0];

          setTitle(item.snippet.title);
          setDom(info, temp.video_entry_template.supplant({
            "title": item.snippet.title,
            "video_id": my_video_id,
            "views": parseInt(item.statistics.viewCount, 10).toLocaleString()
          }), true);

          setViewsSlider(info.querySelector(".frube-like"), item.statistics);
          setVideoSlider(dict.video_slider, item.contentDetails);
        });
    })

    .declareMethod("changeVideoPosition", function (my_id, my_pos, my_shift) {
      var gadget = this;
      return new RSVP.Queue()
        .push(function () {
          return gadget.frube_get(my_id);
        })
        .push(function (video_data) {
          video_data.pos = parseInt(my_pos, 10) + my_shift;
          return gadget.frube_put(my_id, video_data);
        })
        .push(function () {
          return gadget.refreshPlaylist();
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
        return gadget.jumpVideo(1);
      }
    })

    .declareMethod("refreshPlaylist", function () {
      var gadget = this,
        dict = gadget.property_dict,
        temp = gadget.template_dict;

      // blank lookup for prev/next video id, then sort by pos, which
      // contains counters of forward/backward movements (not position)
      dict.queue_list = [];

      return new RSVP.Queue()
        .push(function () {
          return gadget.frube_allDocs({"include_docs": true});
        })
        .push(function (my_response) {
          var response = my_response.data.rows.map(function (item) {
            item.doc.id = item.doc.id || item.id;
            return item.doc;
          }).sort(dynamicSort("-pos")),
          len = my_response.data.total_rows,
          html_content;

          response.forEach(function (doc, pos) {
            dict.queue_list.push(doc.id);
            html_content += temp.queue_entry_template.supplant({
              "video_id": doc.id,
              "title": setArtistAndTitle(doc),
              "thumbnail_url": doc.custom_thumbnail || doc.original_thumbnail,
              "pos": doc.pos,
              "disable_first": pos === 0 ? DISABLED : STR,
              "disable_last": pos === len - 1 ? DISABLED : STR,
              "overlay": STR
            });
          });
          setDom(gadget.property_dict.playlist, html_content, true);
        });
    })

    .declareMethod("addVideo", function (video_id) {
      var gadget = this,
        dict = gadget.property_dict,
        video_dict = dict.search_result_dict[video_id];

      return new RSVP.Queue()
        .push(function () {
          return gadget.frube_put(video_dict.id.videoId || video_dict.id, {
            "id": video_dict.id.videoId,
            "type": video_dict.id.kind,
            "original_title": video_dict.snippet.title,
            "original_artist": '',
            "original_thumbnail": video_dict.snippet.thumbnails.medium.url,
            "custom_title": '',
            "custom_artist": '',
            "custom_thumbnail": '',
            "timestamp": new Date().getTime(),
            "pos": 0
          });
        });
    })

    .declareMethod("refreshSearchResults", function () {
      var gadget = this,
        dict = gadget.property_dict,
        catalog = dict.search_result_dict,
        response = "",
        item_id,
        item;

      for (item_id in catalog) {
        if (catalog.hasOwnProperty(item_id)) {
          item = catalog[item_id];
          response += gadget.template_dict.search_entry_template.supplant({
            "video_id": item.id.videoId,
            "title": item.snippet.title,
            "thumbnail_url": item.snippet.thumbnails.medium.url,
            "overlay": ''
          });
        }
      }
      setDom(dict.search_results, response, true);
    })

    .declareMethod("jumpVideo", function (my_shift) {
      var gadget = this,
        dict = gadget.property_dict;

      return new RSVP.Queue()
        .push(function () {
          return gadget.changeState({
            "play": getVideoId(dict.queue_list, gadget.state.play, my_shift)
          });
        })
        .push(function () {
          dict.player.stopVideo();
          return RSVP.all([
            gadget.refreshPlaylist(),
            gadget.updateSlider()
          ]);
        });
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

      // blank index unless loading more or coming from deeplink
      if (!my_next_page || Object.keys(dict.search_result_dict).length === 1) {
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

          // XXX memory storage?
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
          console.log(error)
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

    /////////////////////////////
    // declared jobs
    /////////////////////////////

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
        var video_id = getVideoHash();
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
    // on state change
    /////////////////////////////
    .onStateChange(function (modification_dict) {
      var gadget = this,
        dict = gadget.property_dict;

      // trigger loading of new video
      if (modification_dict.hasOwnProperty("play")) {
        return new RSVP.Queue()
          .push(function () {
            return gadget.exitSearch();
          })
          .push(function () {
            if (modification_dict.play) {
              setVideoHash(modification_dict.play);
            }
            return;
          });
      }

      // switch between search and playlist mode
      if (modification_dict.hasOwnProperty("mode")) {
        if (modification_dict.mode === "searching") {
          dict.playlist.classList.add("hidden");
          dict.player_container.classList.add("hidden");
          dict.player_controller.classList.remove("hidden");
          dict.search_results.classList.remove("hidden");
        } else {
          dict.playlist.classList.remove("hidden");
          dict.search_results.classList.add("hidden");
          dict.player_controller.classList.add("hidden");
          dict.player_container.classList.remove("hidden");
          return gadget.refreshPlaylist();
        }
      }
      
      // return so chains will not break;
      return;
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
        default:
          return gadget.changeState({"play": attr});
      }
    }, false, false)

    .onEvent("submit", function (event) {
      var gadget = this,
        attr = anyAttribute(event.target);

      switch (attr) {
        case "frube-playlist-remove":
          return gadget.removeVideo(getId(event));
        case "frube-playlist-add":
          return gadget.addVideo(getId(event));
        case "frube-playlist-front":
          return gadget.changeVideoPosition(getId(event), getPos(event), 1);
        case "frube-playlist-back":
          return gadget.changeVideoPosition(getId(event), getPos(event), -1);
        case "frube-playlist-play":
          return gadget.changeState({"play": getId(event)});
        case "frube-playlist-next":
          return gadget.jumpVideo(1);
        case "frube-playlist-previous":
          return gadget.jumpVideo(-1);
        case "frube-dialog-configure-set":
          return; // for now
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
        case "frube-search-source":
          return gadget.runSearch(true);
        case "frube-play-pause":
          playOrPause(gadget.property_dict.player);
          break;
        case "frube-set-volume":
          setVolume(gadget.property_dict.player, event);
          break;
      }
    }, false, true);

}(window, rJS, jIO, RSVP, YT, JSON, loopEventListener));
