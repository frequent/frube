/*jslint nomen: true, indent: 2, maxlen: 80 */
/*global window, rJS, RSVP, YT, JSON, Blob, URL, Math, SimpleQuery, Query,
  ComplexQuery */
(function (window, rJS, RSVP, YT, JSON, Blob, URL, Math, SimpleQuery, Query,
  ComplexQuery) {
    "use strict";

  // KUDOS: https://github.com/boramalper/Essential-YouTube
  // https://developers.google.com/youtube/iframe_api_reference
  // https://developers.google.com/youtube/player_parameters?playerVersion=HTML5
  // https://getmdl.io/components/index.html

  /////////////////////////////
  // parameters
  /////////////////////////////
  var ACTION = "data-action";
  var ADD = "playlist_add";
  var AND = " - ";
  var ARR = [];
  var BUTTON = "button";
  var CLOSE = "frube-dialog-close";
  var CODE = ["encode", "decode"];
  var DELETED = "frube-video-deleted";
  var DIALOG = ".frube-dialog-";
  var DISABLED = "disabled";
  var FILTER = "filter";
  var FORBIDDEN = 403;
  var FRUBE = "frube_jio";
  var HI = "hd720";
  var HIDDEN = "frube-hidden";
  var ICON = "i";
  var ID = "data-video";
  var IS_SLIDER = "slider";
  var LIKE = ".frube-like";
  var LISTED = "frube-video-listed";
  var LO = "tiny";
  var MINUS = "-";
  var NAME = "name";
  var OFFLINE = "offline";
  var OPAQUE = "frube-disabled";
  var OVERLAY = "frube-overlay";
  var PLACEHOLDER = "placeholder.png";
  var PLAY = "library_music";
  var PLAYING = "frube-video-playing";
  var PLAYLIST = "playlist";
  var POS = "data-position";
  var REMOVE = "delete_sweep";
  var REPEAT = ".frube-btn-repeat";
  var SEARCH = "search";
  var SEARCHING = "searching";
  var SECTION = "section";
  var SETTING = "setting_jio";
  var SHUFFLE = ".frube-btn-shuffle";
  var SPC = " ";
  var SPIN = "frube-spin";
  var STR = "";
  var SUBMIT = ".frube-dialog-submit";
  var TEN_MINUTES = 600000;
  var TUBE = "tube_jio";
  var UNDO = "undo_edit";
  var WATCHING = "watching";

  var GADGET_KLASS = rJS(window);
  var DIALOG_POLYFILL = window.dialogPolyfill;
  var INTERSECTION_OBSERVER = window.IntersectionObserver;

  /////////////////////////////
  // methods
  /////////////////////////////
  function lower(my_string) {
    return my_string.toLowerCase();
  }

  function codify(my_string, my_index) {
    return window[CODE[my_index] + "URIComponent"](my_string);
  }
  
  function getTemplate(my_klass, my_id) {
    return my_klass.__template_element.getElementById(my_id).innerHTML;
  }

  function getTimeStamp() {
    return new window.Date().getTime();
  }

  function getElem(my_element, my_selector) {
    return my_element.querySelector(my_selector);
  }

  function getAttr(my_event, my_attribute) {
    return my_event.target.querySelector(BUTTON).getAttribute(my_attribute);
  }

  function setOverlay(my_element, my_class_flag, my_action) {
    if (my_element) {
      my_element.classList[my_action](OVERLAY, my_class_flag);
    }
  }

  function getVideo(my_element, my_video_id) {
    return getElem(my_element, "div[data-video='" + my_video_id + "']");
  }

  function setButtonIcon(my_button, my_icon) {
    getElem(my_button, ICON).textContent = my_icon;
  }

  function mergeDict(my_return_dict, my_new_dict) {
    return Object.keys(my_new_dict).reduce(function (pass_dict, key) {
      pass_dict[key] = my_new_dict[key];
      return pass_dict;
    }, my_return_dict);
  }

  function getLocalConfig(my_fallback) {
    /*
    if (my_fallback) {
      return {"type": "indexeddb", "database": "frube"};
    }
    return {
      "type": "worker",
      "scope": "/",
      "url": "gadget_frube_serviceworker.js",
      "prefetch_url_list": [],
      "prefetch_update": true,
      "claim_clients": true,
      "skip_waiting": true,
      "manifest_url": "gadget_frube.appcache",
      "sub_storage": {
        "type": "index",
        "index_generator": "gadget_frube_index.js",
        "index_storage": {
          "type": "indexeddb",
          "database": "frube-lookup"
        },
        "sub_storage": {
          "type": "cache",
          "cache_name": "frube",
          "version": 1
        }
      }
    };
    */
    return {"type": "indexeddb", "database": "frube"};
  }

  function getFrubeConfig(my_token, my_fallback) {
    if (my_token) {
      return {
        "type": "replicate",
        "parallel_operation_amount": 10,
        "check_local_modification": true,
        "check_local_creation": true,
        "check_local_deletion": true,
        "conflict_handling": 1,
        "local_sub_storage": getLocalConfig(my_fallback),
        "remote_sub_storage": {
          "type": "query",
          "sub_storage": {
            "type": "drivetojiomapping",
            "sub_storage": {
              "type": "dropbox",
              "access_token": my_token,
              "root": "sandbox",
              "batch_upload": true
            }
          }
        }
      };
    }
    return getLocalConfig(my_fallback);
  }

  function getTubeConfig(my_id) {
    return {"type": "youtube", "api_key": my_id};
  }

  function setVideoHash(my_list) {
    return getVideoHash() || my_list[getRandomDigit(my_list.length - 1)] || null;    
  }

  function getVideoHash() {
    var id = window.location.hash.slice(1, 1 + 11);
    if (id.length === 11) {
      return id;
    }
  }

  function resizeFileToBase64(my_file) {
    return new RSVP.Promise(function (resolve, reject) {
      var img = new Image();
      var canvas = window.document.createElement("canvas");

      img.onload = function () {
        canvas.width = 320;
        canvas.height = 320;
        canvas.getContext("2d").drawImage(img, 0, 0, 320, 320);
        resolve(canvas.toDataURL(my_file.type));
      };
      img.onerror = function (event) {
        reject(event);
      };
      img.src = URL.createObjectURL(my_file);
    });
  }

  function purgeDom(my_node) {
    while (my_node.firstChild) {
      my_node.removeChild(my_node.firstChild);
    }
  }

  function setDom(my_node, my_string, my_purge) {
    var faux_element = window.document.createElement(SECTION);
    if (my_purge) {
      purgeDom(my_node);
    }
    faux_element.innerHTML = my_string;
    ARR.slice.call(faux_element.children).forEach(function (element) {
      my_node.appendChild(element);
    });
  }

  function calc(my_list, my_now, my_lifetime) {
    return (my_list || ARR).reduce(function (total, tick) {
      return total + (1 - (my_now - tick)/my_lifetime);
    }, 0);
  }

  function getScore(my_ups, my_downs, my_life) {
    var now = getTimeStamp();
    var life = now - my_life;
    return (calc(my_ups, now, life) - calc(my_downs, now, life));
  }

  function setViewsSlider(my_element, my_score) {
    if (!my_element.MaterialProgress) {
      window.componentHandler.upgradeElements(my_element);
    }
    if (my_score) {
      my_element.MaterialProgress.setProgress(my_score * 10);
    }
  }

  function setVideoSlider(my_element, my_stats) {
    my_element.setAttribute("max", parseDuration(my_stats.duration));
    my_element.value = 0;
  }

  // http://javascript.crockford.com/remedial.html
  if (!String.prototype.supplant) {
    String.prototype.supplant = function (o) {
      var str = this;
      return str.replace(
        /\{([^{}]*)\}/g,
        function (a, b) {
          var r = o[b];
          return typeof r === "string" || typeof r === "number" ? r : a;
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
    var matches = duration.match(/[0-9]+[HMS]/g);
    var seconds = 0;

    matches.forEach(function (part) {
      var unit = part.charAt(part.length-1);
      var amount = parseInt(part.slice(0,-1), 10);

      switch (unit) {
        case "H":
          seconds += amount * 60 * 60;
          break;
        case "M":
          seconds += amount * 60;
          break;
        case "S":
          seconds += amount;
          break;
      }
    });
    return seconds;
  }

  function setVolume(my_player, my_event) {
    if (my_player.isMuted()) {
      setButtonIcon(getElem(my_event.target, BUTTON), "volume_up");
      my_player.unMute();
    } else {
      setButtonIcon(getElem(my_event.target, BUTTON), "volume_off");
      my_player.mute();
    }
  }

  function playOrPause(my_player) {
    if (my_player.getPlayerState() === YT.PlayerState.PLAYING) {
      my_player.pauseVideo();
    } else {
      my_player.playVideo();
    }
  }

  function getRandomDigit(my_len) {
    return Math.round(Math.random() * (my_len - 1), 0);
  }

  function swapVideo(my_element) {
    var next_video = getVideo(my_element, getVideoHash());
    setOverlay(getElem(my_element, "." + PLAYING), PLAYING, "remove");
    if (next_video) {
      setOverlay(next_video, PLAYING, "add");
    }
  }

  function unsetLoader(my_button) {
    if (getElem(my_button, ".frube-loader")) {
      my_button.removeChild(getElem(my_button, ".frube-loader"));
    }
  }

  function setLoader(my_button) {
    if (!getElem(my_button, ".frube-loader")) {
      setDom(my_button, getTemplate(GADGET_KLASS, "loader_template").supplant());
      window.componentHandler.upgradeElements(my_button);
    }
  }

  function unsetSearch(my_dict, my_offline) {
    setDom(my_dict, getTemplate(GADGET_KLASS, "status_template").supplant({
      "status": my_offline ? OFFLINE : SEARCHING
    }), true);
  }

  function setQueueList(my_id, my_list) {
    if (my_list.indexOf(my_id) === -1) {
      my_list.push(my_id);
    }
    return my_list;
  }

  function unsetQueueList(my_id, my_list) {
    return my_list.filter(function (item) {
      return item !== my_id;
    });
  }

  function setQuery(my_key, my_val) {
    return new SimpleQuery({"key": my_key, "value": my_val, "type": "simple"});
  }

  function updateFileInput(my_element, my_event) {
    return new RSVP.Queue()
      .push(function () {
        return resizeFileToBase64(my_event.target.files[0]);
      })
      .push(function (blob) {
        getElem(my_element, ".frube-edit-cover-image").src =
        getElem(my_element, ".frube-edit-cover").value = blob;
        my_event.target.previousElementSibling.textContent = "delete";
      });
  }

  function setFileInput(my_element, my_event) {
    var bad_indicator = my_event.target.previousElementSibling;
    if (bad_indicator.textContent === "delete") {
      bad_indicator.textContent = "attach_file";
      getElem(my_element, ".frube-edit-cover-image").src = PLACEHOLDER;
      getElem(my_element, ".frube-edit-cover").value = STR;
      my_event.preventDefault();
      return false;
    }
  }

  function setVideoControls(my_dict, my_video_id) {
    var is_queued = my_dict.queue_list.indexOf(my_video_id) > -1;
    var is_buffered = my_dict.buffer_dict.hasOwnProperty(my_video_id);
    var item = my_dict.current_video;
    var info = my_dict.video_info;
    setDom(info, getTemplate(GADGET_KLASS, "video_template").supplant({
      "title": is_queued ? setTitle(item) : item.snippet.title,
      "video_id": my_video_id,
      "views": parseInt(item.statistics.viewCount, 10).toLocaleString(),
      "score": item.score.toFixed(5),
      "action_title": is_queued ? "remove" : "add",
      "action_hint": is_queued ? "Remove from List": "Add to Playlist",
      "action_icon": is_buffered ? UNDO : is_queued ? REMOVE : ADD,
      "disabled_next": my_dict.queue_list.length < 2 ? DISABLED : STR,
      "disabled_rate": is_queued ? STR : DISABLED
    }), true);
    setViewsSlider(getElem(info, LIKE), item.score);
  }

  function setPlaylistControl(my_dict, my_list) {
    getElem(my_dict.playlist_menu, ".frube-playlist-id").textContent =
      codify(my_list, 1);
  }

  function noMatch(my_query, my_str) {
    return my_query !== STR && lower(my_str).indexOf(my_query) === -1;
  }

  function setTitle(my_doc) {
    var artist = my_doc.custom_artist;
    var title = my_doc.custom_title || my_doc.original_title;
    var album = my_doc.custom_album;
    return [artist, title, album].filter(Boolean).join(AND);
  }

  function filterTracklist(my_data, my_list, my_query) {
    var query = lower(my_query);
    return my_data.dump.map(function (doc) {
      var str = doc.title = setTitle(doc);
      if (noMatch(query, str) || my_list.queue_list.indexOf(doc.id) === -1) {
        return;
      }
      return doc;
    }).filter(Boolean).sort(dynamicSort("-pos"));
  }

  function getPlaylist(my_data, my_state, my_active_list) {
    var root_list;
    var active_list;
    var doc_dump = [];
    var track_list = my_data.map(function (item) {
      var doc = item.doc;
      if (doc.root) {
        root_list = doc;
      }
      if (my_active_list && my_active_list === doc.id) {
        active_list = doc;
      }
      if (doc.id && doc.portal_type !== PLAYLIST) {
        doc_dump.push(doc);
        return doc.id;
      }
    }).filter(Boolean);
    active_list = active_list || root_list || {queue_list: []};
    if (root_list && (active_list.id === root_list.id)) {
      active_list.queue_list = track_list;
    }
    return {"active_list": active_list, "dump": doc_dump};
  }

  function observeImage(my_dict, my_image_list) {
    if (!my_dict.observer) {
      return;
    }
    my_image_list.forEach(function (image) {
      my_dict.observer.observe(image);
    });
  }

  function loadImage(entries, observer) {
    entries.forEach(function (entry) {
      var img = entry.target;
      if (img.classList.contains("frube-lazy")) {
        img.classList.remove("frube-lazy");
        img.setAttribute("src", img.getAttribute("data-src"));
        observer.unobserve(img);
      }
    });
  }

  GADGET_KLASS

    /////////////////////////////
    // state
    /////////////////////////////
    .setState({
      zero_stamp: null,
      mode: WATCHING,
      search_time: null,
      video_duration: null,
      last_main_pos: 0,
      next_page_token: null,
      slider_in_use: false,
      is_searching: false,
      play: null,
      quality: LO,
      dropbox_connected: null,
      active_list: null,
      root_list: "Tracklist"
    })

    /////////////////////////////
    // ready
    /////////////////////////////
    .ready(function () {
      var gadget = this;
      var element = gadget.element;

      gadget.property_dict = {
        search_list: [],
        buffer_dict: {},
        filter_list: [],
        queue_list: [],
        player: null,
        current_video: null,
        search_input: getElem(element, ".frube-search-input"),
        action_container: getElem(element, ".frube-action"),
        action_button: getElem(element, ".frube-action-view"),
        main: getElem(element, ".frube-page-content"),
        video_info: getElem(element, ".frube-video-info"),
        video_controller: getElem(element, ".frube-video-controls"),
        video_slider: getElem(element, ".frube-slider"),
        sync_button: getElem(element, ".frube-btn-sync"),
        search_results: getElem(element, ".frube-search-results"),
        playlist: getElem(element, ".frube-playlist-results"),
        playlist_menu: getElem(element, ".frube-playlist-menu"),
        player_container: getElem(element, ".frube-player-container"),
        player_controller: getElem(element, ".frube-player-controller")
      };

      return gadget.loopSlider();
    })

    /////////////////////////////
    // acquired methods
    /////////////////////////////

    /////////////////////////////
    // published methods
    /////////////////////////////

    /////////////////////////////
    // declared methods
    /////////////////////////////

    // jio bridge
    .declareMethod("route", function (my_scope, my_call, my_p1, my_p2, my_p3) {
      return this.getDeclaredGadget(my_scope)
        .push(function (my_gadget) {
          return my_gadget[my_call](my_p1, my_p2, my_p3);
        });
    })
    .declareMethod("frube_create", function (my_option_dict) {
      return this.route(FRUBE, "createJIO", my_option_dict);
    })
    .declareMethod("frube_repair", function () {
      return this.route(FRUBE, "repair");
    })
    .declareMethod("frube_allDocs", function (my_option_dict) {
      return this.route(FRUBE, "allDocs", my_option_dict);
    })
    .declareMethod("frube_put", function (my_id, my_dict) {
      return this.route(FRUBE, "put", my_id, my_dict);
    })
    .declareMethod("frube_get", function (my_id) {
      return this.route(FRUBE, "get", my_id);
    })
    .declareMethod("frube_remove", function (my_id) {
      return this.route(FRUBE, "remove", my_id);
    })
    .declareMethod("tube_create", function (my_option_dict) {
      return this.route(TUBE, "createJIO", my_option_dict);
    })
    .declareMethod("tube_allDocs", function (my_option_dict) {
      return this.route(TUBE, "allDocs", my_option_dict);
    })
    .declareMethod("tube_get", function (my_id) {
      return this.route(TUBE, "get", my_id);
    })
    .declareMethod("setting_create", function (my_option_dict) {
      return this.route(SETTING, "createJIO", my_option_dict);
    })
    .declareMethod("setting_getAttachment", function (my_id, my_tag, my_dict) {
      return this.route(SETTING, "getAttachment", my_id, my_tag, my_dict);
    })
    .declareMethod("setting_putAttachment", function (my_id, my_tag, my_dict) {
      return this.route(SETTING, "putAttachment", my_id, my_tag, my_dict);
    })
    .declareMethod("setting_removeAttachment", function (my_id, my_tag) {
      return this.route(SETTING, "removeAttachment", my_id, my_tag);
    })

    .declareMethod("render", function (my_option_dict) {
      var gadget = this;
      var dict = gadget.property_dict;

      window.componentHandler.upgradeDom();
      mergeDict(dict, my_option_dict);
      if (INTERSECTION_OBSERVER !== undefined) {
        dict.observer = new INTERSECTION_OBSERVER(loadImage, {"threshold": 0.5});
      }

      return gadget.evaluateRemoteConnection()
        .push(function () {
          return RSVP.all([
            gadget.tube_create(getTubeConfig(dict.youtube_id)),
            gadget.refreshPlaylist("init"),
            gadget.updateSettings()
          ]);
        })
        .push(function () {
          var video = setVideoHash(dict.queue_list);
          var promise_list = [gadget.stateChange({loader: null, play: video})];
          if (!video) {
            promise_list.push(gadget.enterSearch());
          }
          return RSVP.all(promise_list);
        })
        .push(function () {
          getElem(gadget.element, ".frube-wip").classList.remove("frube-wip");
        });
    })

    .declareMethod("evaluateRemoteConnection", function () {
      var gadget = this;
      return gadget.getSetting("token")
        .push(function (token) {
          return gadget.setRemoteConnection(token);
        });
    })

    .declareMethod("handleError", function (my_error) {
      var gadget = this;

      if (my_error.resume) {
        return RSVP.all([
          gadget.resetFrube(true),
          gadget.waitForNetwork(my_error.resume)
        ]);
      }

      // jIO getAttachment
      if (my_error.status_code === 404) {
        return 0;
      }
      throw my_error;
    })

    .declareMethod("loadVideo", function (my_video_id) {
      var gadget = this;
      var dict = gadget.property_dict;
      var tube_data = {"items": ARR};

      if (!my_video_id) {
        return;
      }
      if (!window.navigator.onLine) {
        return gadget.handleError({"resume": my_video_id});
      }

      return new RSVP.Queue()
        .push(function () {
          return gadget.getSetting("quality");
        })
        .push(function (quality) {
          return gadget.stateChange({"quality": [LO, HI][quality + 0]});
        })
        .push(function () {
          var player = dict.player;
          var main = dict.main;

          function handleReady(my_event) {
            return my_event.target.playVideo();
          }
          function handleError(my_event) {
            return gadget.handleError(my_event);
          }
          function handleStateChange() {
            return gadget.videoOnStateChange();
          }

          if (!player || (player && !player.h)) {
            while (true) {
              try {
                dict.player = new YT.Player("player", {
                  "videoId": my_video_id,
                  "width": main.clientWidth,
                  "height": Math.max(main.clientWidth * 0.66 * 9 / 16, 250),
                  "events": {
                    "onReady": handleReady,
                    "onStateChange": handleStateChange,
                    "onError": handleError
                  },
                  "playerVars": {
                    "showinfo": 0,
                    "disablekb": 1,
                    "iv_load_policy": 3,
                    "rel": 0,
                    "vq": gadget.state.quality,
                    //"fs": 0
                  }
                });
              break;
            } catch (err) {
              continue;
            }
          }

          // let's see if this goes smoothly
          } else if (player.loadVideoById) {
            player.loadVideoById(my_video_id);
          }
          return;
        })
        .push(function () {
          return gadget.tube_get(my_video_id);
        })
        .push(function (tube_response) {
          tube_data = tube_response;
          return gadget.frube_get(my_video_id);
        })
        .push(undefined, function (error) {
          if (error.status_code === 404) {
            return {};
          }
          if (error.target && error.target.status === 400) {
            return gadget.handleError(JSON.parse(error.target.response).error);
          }
          throw error;
        })
        .push(function (frube_response) {
          var data = frube_response;
          var item = dict.current_video = mergeDict(tube_data.items[0], data);
          if (item) {
            window.document.title = item.snippet.title;
            swapVideo(dict.playlist);
            dict.current_video.score = getScore(data.upvote_list, data.downvote_list, gadget.state.zero_stamp);
            setVideoControls(dict, my_video_id);
            setVideoSlider(dict.video_slider, item.contentDetails);
          }
          return;
        });
    })

    .declareMethod("getRandomId", function () {
      var gadget = this;
      var dict = gadget.property_dict;
      var select_list = [];
      var len = dict.queue_list.length;
      var pick = Math.round(len/5, 0);
      var id;

      if (pick === 0) {
        return getRandomDigit(len);
      }
      while (select_list.length <= pick) {
        id = dict.queue_list[getRandomDigit(len)];
        if (select_list.indexOf(id) === -1) {
          select_list.push(gadget.frube_get(id));
        }
      }

      return new RSVP.Queue()
        .push(function () {
          return RSVP.all(select_list);
        })
        .push(function (my_result_list) {
          var high_score_id;

          my_result_list.reduce(function (total, item) {
            var score = getScore(item.upvote_list, item.downvote_list, gadget.state.zero_stamp);
            if (score > total) {
              high_score_id = id;
              return score;
            }
            return total;
          }, 0);

          return high_score_id || my_result_list[getRandomDigit(pick)].id;
        });
    })

    .declareMethod("getVideoId", function (my_jump) {
      var gadget = this;
      var dict = gadget.property_dict;
      var state = gadget.state;
      var list = state.mode === SEARCHING ? dict.search_list.map(function (item) {
        return item.id.videoId;
      }) : dict.queue_list;
      if (my_jump === null) {
        return gadget.getRandomId();
      }
      return list[list.indexOf(state.play) + my_jump] || null;
    })

    .declareMethod("rankVideo", function (my_id, my_pos, my_shift) {
      var gadget = this;
      return gadget.frube_get(my_id)
        .push(function (video_data) {
          video_data.pos = parseInt(my_pos, 10) + my_shift;
          return RSVP.all([
            gadget.frube_put(my_id, video_data),
            gadget.stateChange({"blur": true}),
            gadget.refreshPlaylist()
          ]);
        });
    })

    .declareMethod("rateVideo", function (my_id, my_direction) {
      var gadget = this;
      var dict = gadget.property_dict;
      return gadget.frube_get(my_id)
        .push(function (video) {
          var score;
          if (my_direction > 0) {
            video.upvote_list.push(getTimeStamp());
          } else {
            video.downvote_list.push(getTimeStamp());
          }
          score = getScore(video.upvote_list, video.downvote_list, gadget.state.zero_stamp);
          getElem(gadget.element, ".frube-like-count").textContent = score.toFixed(5);
          setViewsSlider(getElem(dict.video_info, ".frube-like"), score);
          return RSVP.all([
            gadget.frube_put(my_id, video),
            gadget.stateChange({"blur": true})
          ]);
        });
    })

    .declareMethod("videoOnStateChange", function () {
      var gadget = this;
      var player = gadget.property_dict.player;
      var current_state = player.getPlayerState();
      var play_icon = getElem(gadget.element, ".frube-btn-play-pause i");
      if (current_state === YT.PlayerState.ENDED) {
        if (getElem(gadget.element, REPEAT).checked) {
          player.seekTo(0, true);
          player.playVideo();
        } else {
          play_icon.textContent = "play_arrow";
          return gadget.jumpVideo(1);
        }
      } else if (current_state === YT.PlayerState.PLAYING) {
        play_icon.textContent = "pause";
      } else {
        play_icon.textContent = "play_arrow";
      }
    })

    .declareMethod("resetFrube", function (my_offline) {
      var gadget = this;
      var dict = gadget.property_dict;

      window.location.hash = STR;
      dict.search_input.value = STR;
      if (dict.player && dict.player.getPlayerState() <= 0) {
        dict.player_container.classList.add(HIDDEN);
        dict.player.destroy();
      }
      dict.search_list = [];
      dict.video_controller.classList.add(HIDDEN);
      dict.player_controller.classList.add(HIDDEN);
      purgeDom(dict.video_info);
      unsetSearch(dict.search_results, my_offline);
      return RSVP.all([
        gadget.refreshSearchResults(),
        gadget.enterSearch()
      ]);
    })

    .declareMethod("removeVideo", function (my_video_id, my_element) {
      var gadget = this;
      var dict = gadget.property_dict;

      // undo = unflag for deletion
      if (dict.buffer_dict.hasOwnProperty(my_video_id)) {
        setButtonIcon(getElem(my_element, BUTTON), REMOVE);
        setOverlay(getVideo(dict.playlist, my_video_id), DELETED, "remove");
        delete dict.buffer_dict[my_video_id];
      } else {
        dict.buffer_dict[my_video_id] = undefined;
        setButtonIcon(getElem(my_element, BUTTON), UNDO);
        setOverlay(getVideo(dict.playlist, my_video_id), DELETED, "add");  
      }
      if (gadget.state.mode === WATCHING && dict.current_video) {
        setVideoControls(dict, gadget.state.play);
      }
      return gadget.stateChange({"blur": true});
    })

    .declareMethod("handleDialog", function (my_event, my_action) {
      var gadget = this;
      var action = my_action || my_event.target.getAttribute(ACTION);
      var dialog = getElem(gadget.element, (DIALOG + action));
      var active_element = window.document.activeElement;
      if (active_element && active_element.classList.contains(CLOSE)) {
        dialog.close();
        return;
      }
      if (!dialog.open) {
        if (!dialog.showModal) {
          DIALOG_POLYFILL.registerDialog(dialog);
        }
        dialog.showModal();
        if (action === PLAYLIST) {
          return gadget.filterPlaylist();
        }
        return;
      }
      if (action === "edit") {
        dialog.close();
        return gadget.setVideoInfo(getAttr(event, ID), dialog);
      }
    })

    .declareMethod("setVideoInfo", function (my_id, my_dialog) {
      var gadget = this;
      return gadget.frube_get(my_id)
        .push(function (video) {
          video.custom_title = getElem(my_dialog, ".frube-edit-title").value;
          video.custom_album = getElem(my_dialog, ".frube-edit-album").value;
          video.custom_artist = getElem(my_dialog, ".frube-edit-artist").value;
          video.custom_cover = getElem(my_dialog, ".frube-edit-cover").value;
          return RSVP.all([
            gadget.frube_put(my_id, video),
            gadget.stateChange({"blur": true}),
            gadget.refreshPlaylist()
          ]);
        });
    })

    .declareMethod("editVideo", function (my_event, my_video_id) {
      var gadget = this;
      var action = my_event.target.getAttribute(ACTION);
      var dialog = getElem(gadget.element, (DIALOG + action));
      var button = dialog.querySelector(SPC + SUBMIT);

      if (button) {
        button.setAttribute("data-video", my_video_id);
        return new RSVP.Queue()
          .push(function () {
            return gadget.frube_get(my_video_id);
          })
          .push(function (data) {
            setDom(getElem(dialog, ".frube-dialog-content"),
              getTemplate(GADGET_KLASS, "edit_template").supplant({
                "video_title": data.custom_title,
                "video_artist": data.custom_artist,
                "video_album": data.custom_album,
                "video_cover": data.custom_cover || PLACEHOLDER,
                "bad_indicator": data.custom_cover ? "delete" : "attach_file"
              }), true);
            window.componentHandler.upgradeElements(dialog);
            return gadget.handleDialog(null, action);
          });
      }
    })

    .declareMethod("addVideo", function (my_video_id, my_element) {
      var gadget = this;
      var dict = gadget.property_dict;
      var meta = dict.search_list.filter(function (item) {
        return item.id.videoId === my_video_id ? item : undefined;
      }).pop() || dict.current_video;
      if (dict.buffer_dict.hasOwnProperty(my_video_id)) {
        setButtonIcon(getElem(my_element, BUTTON), ADD);
        setOverlay(getVideo(dict.search_results, my_video_id), LISTED, "remove");
        delete dict.buffer_dict[my_video_id];
      } else {
        setButtonIcon(getElem(my_element, BUTTON), UNDO);
        setOverlay(getVideo(dict.search_results, my_video_id), LISTED, "add");

        // stack for storing
        dict.buffer_dict[my_video_id] = {
          "id": my_video_id,
          "type": meta.id.kind,
          "portal_type": "track",
          "original_title": meta.snippet.title,
          "original_artist": STR,
          "original_cover": meta.snippet.thumbnails.medium.url,
          "custom_title": STR,
          "custom_artist": STR,
          "custom_album": STR,
          "custom_cover": STR,
          "upvote_list": [],
          "downvote_list": [],
          "timestamp": new Date().getTime(),
          "pos": 0
        };
      }
      if (gadget.state.mode === WATCHING) {
        setVideoControls(dict, gadget.state.play);
      }
      return gadget.stateChange({"blur": true});
    })

    .declareMethod("clearBuffer", function () {
      var gadget = this;
      var dict = gadget.property_dict;
      var buffer = dict.buffer_dict;
      var key_list = Object.keys(buffer);
      if (key_list.length === 0) {
        return;
      }
      return gadget.frube_get(gadget.state.active_list)
        .push(function (my_playlist) {
          var promise_list = [];
          var queue_list = my_playlist.queue_list;
          key_list.forEach(function (id) {
            var item = buffer[id];
            if (item) {
                promise_list.push(gadget.frube_put(id, item));
                queue_list = setQueueList(id, queue_list);
              } else {
                promise_list.push(gadget.frube_remove(id));
                queue_list = unsetQueueList(id, queue_list);
              }
              delete buffer[id];
          });
          my_playlist.queue_list = dict.queue_list = queue_list;
          promise_list.push(gadget.frube_put(my_playlist.id, my_playlist));
          return RSVP.all(promise_list);
        })
        .push(undefined, function (err) {
          throw err;
        });
    })

    .declareMethod("refreshSearchResults", function () {
      var dict = this.property_dict;
      var active_list = this.state.active_list;
      var list = dict.queue_list;
      var response = STR;
      var is_listed;
      dict.search_list.forEach(function (item) {
        var key = item.id.videoId;
        is_listed = list.indexOf(key) > -1;
        response += getTemplate(GADGET_KLASS, "search_template").supplant({
          "video_id": key,
          "title": item.snippet.title,
          "thumbnail_url": item.snippet.thumbnails.medium.url,
          "overlay": is_listed ? (OVERLAY + SPC + LISTED) : STR,
          "disabled": is_listed ? DISABLED : STR,
          "class": is_listed ? OPAQUE : STR,
          "active_playlist": codify(active_list, 1)
        });
      });
      if (response !== STR) {
        response += getTemplate(GADGET_KLASS, "load_template".supplant());
        setDom(dict.search_results, response, true);
      }
      if (this.state.play !== null) {
        setVideoControls(dict, this.state.play);
      }
    })

    .declareMethod("jumpVideo", function (my_jump) {
      var gadget = this;
      var element = gadget.element;
      var jump = getElem(element, SHUFFLE).checked ? null : my_jump;
      return gadget.getVideoId(jump)
        .push(function (my_id) {
          if (my_id === null) {
            return gadget.resetFrube();
          }
          return gadget.stateChange({"play": my_id});
        })
        .push(function () {
          return gadget.updateSlider();
        });
    })

    .declareMethod("updateSlider", function () {
      var gadget = this;
      var state = gadget.state;
      var dict = gadget.property_dict;
      var player = dict.player;
      var slider = dict.video_slider;

      if (state.mode === WATCHING) {
        return;
      }
      if (state.slider_in_use || !slider.MaterialSlider) {
        return;
      }
      if (!player || !player.getCurrentTime) {
        return;
      }
      slider.MaterialSlider.change(player.getCurrentTime());
    })

    .declareMethod("connectAndSyncWithDropbox", function() {
      var gadget = this;
      return gadget.getDeclaredGadget("dropbox")
        .push(function (my_dropbox_gadget) {
          return my_dropbox_gadget.setDropbox(gadget.property_dict.dropbox_id);
        })
        .push(function (my_oauth_dict) {
          return gadget.setRemoteConnection(my_oauth_dict.access_token);
        });
    })

    .declareMethod("setRemoteConnection", function (my_token) {
      var gadget = this;
      var dict = gadget.property_dict;
      if (!my_token) {
        setButtonIcon(dict.sync_button, "sync_disabled");
        gadget.state.dropbox_connected = null;
        return gadget.frube_create(getFrubeConfig());
      }
      gadget.state.dropbox_connected = true;
      return new RSVP.Queue()
        .push(function () {
          return RSVP.all([
            gadget.frube_create(getFrubeConfig(my_token)),
            gadget.setSetting("token", my_token)
          ]);
        }, function (connection_error) {
          if (connection_error.status_code === 400) {
            return gadget.frube_create(getFrubeConfig(my_token, true));
          }
          return gadget.handleError(connection_error);
        })
        .push(function () {
          setButtonIcon(dict.sync_button, "sync");
          dict.sync_button.removeAttribute(DISABLED);
          return RSVP.all([
            gadget.syncPlaylist(),
            gadget.stateChange({"mode": WATCHING})
          ]);
        });
    })

    .declareMethod("enterSearch", function () {
      if (this.state.mode !== SEARCHING) {
        return this.stateChange({"mode": SEARCHING});
      }
    })

    .declareMethod("exitSearch", function () {
      if (this.state.mode !== WATCHING) {
        return this.stateChange({"mode": WATCHING});
      }
    })

    .declareMethod("triggerSearchFromScroll", function () {
      var gadget = this;
      var state = gadget.state;
      var main = event.target;
      var main_pos = main.scrollTop;
      var height_trigger;
      var sec_trigger;
      if (state.mode === SEARCHING && state.is_searching !== true) {
        if (main_pos >= state.last_main_pos) {
          gadget.state.last_main_pos = main_pos;
          height_trigger = main_pos + main.clientHeight + 300;
          if (height_trigger >= main.scrollHeight) {
            sec_trigger = getTimeStamp() - state.search_time > 250;
            if (sec_trigger) {
              return gadget.runSearch(true);
            }
          }
        }
      }
    })

    .declareMethod("runSearch", function (my_next_page, my_skip) {
      var gadget = this;
      var dict = gadget.property_dict;
      var state = gadget.state;
      if (state.is_searching && !my_skip) {
        state.is_searching = false;
        return gadget.stateChange({"loader": null});
      }
      if (!my_next_page) {
        dict.search_list = [];
        gadget.state.last_main_pos = 0;
      }
      gadget.state.is_searching = true;
      gadget.state.search_time = getTimeStamp();
      return gadget.stateChange({"loader": true})
        .push(function () {
          var token = STR;
          var query = setQuery("q", dict.search_input.value);
          if (my_next_page && state.next_page_token) {
            query = new ComplexQuery({
              "operator": "AND",
              "type": "complex",
              "query_list": [query, setQuery("token", state.next_page_token)]
            });
          }
          return RSVP.all([
            gadget.tube_allDocs({"query": Query.objectToSearchText(query)}),
            gadget.enterSearch()
          ]);
        })
        .push(function (my_response_list) {
          var response = my_response_list[0];
          var item;
          var i;
          if (response.data.total_rows > 0) {
            response.nextPageToken = response.data.rows.nextPageToken;
          }
          for (i = 0; i < response.data.total_rows; i += 1) {
            item = response.data.rows[i];
            dict.search_list.push(item);
          }
          gadget.state.next_page_token = response.nextPageToken;
          return RSVP.all([
            gadget.refreshSearchResults(),
            gadget.stateChange({"loader": null})
          ]);
        })
        .push(function () {
          gadget.state.is_searching = false;
        })
        .push(undefined, function (error) {
          gadget.state.is_searching = false;
          if (error.target === undefined) {
            throw error;
          }
          if (error.target.status === 400) {
            return gadget.handleError(JSON.parse(error.target.response).error);
          }
          return gadget.stateChange({"loader": null});
        });
    })

    .declareMethod("stateChange", function (delta) {
      var gadget = this;
      var dict = gadget.property_dict;
      var state = gadget.state;
      var video_hash;
      var promise_list = [];
      if (delta.hasOwnProperty("blur")) {
        return window.document.activeElement.blur();
      }
      if (delta.hasOwnProperty("loader")) {
        if (delta.loader) {
          setLoader(dict.action_button);
        } else {
          unsetLoader(dict.action_button);
        }
      }
      if (delta.hasOwnProperty("root_list")) {
        state.root_list = delta.root_list;
      }
      if (delta.hasOwnProperty("active_list")) {
        state.active_list = delta.active_list || codify(state.root_list, 0);
        promise_list.push(gadget.setActivePlaylist(state.active_list));
      }
      if (delta.hasOwnProperty("play")) {
        state.play = delta.play;
        video_hash = getVideoHash();
        if (delta.play === video_hash) {
          promise_list.push(gadget.loadVideo(video_hash));
        }
        if (delta.play === null) {
          dict.video_controller.classList.add(HIDDEN);
        } else {
          window.location.hash = delta.play;
          swapVideo(dict.playlist);
          dict.video_controller.classList.remove(HIDDEN);
        }
      }
      if (delta.hasOwnProperty("mode")) {
        state.mode = delta.mode;
        dict.main.scrollTop = 0;
        if (delta.mode === SEARCHING) {
          setButtonIcon(getElem(dict.action_container, BUTTON), PLAY);
          dict.playlist_menu.classList.add(HIDDEN);
          dict.playlist.classList.add(HIDDEN);
          dict.player_container.classList.add(HIDDEN);
          dict.player_controller.classList.remove(HIDDEN);
          dict.search_results.classList.remove(HIDDEN);
          dict.search_input.focus();
          promise_list.push(gadget.clearBuffer()
            .push(function () {
              return gadget.refreshSearchResults();
            }));
        } else {
          setButtonIcon(getElem(dict.action_container, BUTTON), SEARCH);
          dict.playlist_menu.classList.remove(HIDDEN);
          dict.playlist.classList.remove(HIDDEN);
          dict.search_results.classList.add(HIDDEN);
          dict.player_controller.classList.add(HIDDEN);
          dict.player_container.classList.remove(HIDDEN);
          setPlaylistControl(dict, state.active_list);
          promise_list.push(gadget.clearBuffer()
            .push(function () {
              return gadget.refreshPlaylist();
            }));
        }
      }
      if (delta.hasOwnProperty("quality")) {
        if (dict.player && delta.quality !== state.quality) {
          dict.player.destroy();
        }
        state.quality = delta.quality;
      }
      return RSVP.all(promise_list);
    })

    .declareMethod("updateSettings", function () {
      var gadget = this;
      return RSVP.all(
        ARR.slice.call(
          gadget.property_dict.playlist_menu.querySelectorAll('[type="checkbox"]')
        ).map(function (box) {
            var action = box.getAttribute(ACTION);
            return gadget.getSetting(action)
              .push(function (action) {
                box.checked = !action ? false : action || false;
                box.parentElement.MaterialSwitch.checkToggleState();
              });
          })
        );
    })

    .declareMethod("getSetting", function (my_setting) {
      var gadget = this;
      return gadget.setting_getAttachment("/", my_setting, {format: "text"})
        .push(function (response) {
          var payload = JSON.parse(response);
          if (getTimeStamp() - payload.timestamp > TEN_MINUTES) {
            return gadget.setting_removeAttachment("/", "token");
          }
          return payload[my_setting];
        })
        .push(undefined, gadget.handleError);
    })

    .declareMethod("setSetting", function (my_setting, my_value) {
      var payload = {"timestamp": getTimeStamp()};
      payload[my_setting] = my_value;
      return this.setting_putAttachment("/", my_setting, new Blob([
        JSON.stringify(payload)
      ], {type: "text/plain"}));
    })

    .declareMethod("refreshPlaylist", function (my_flag) {
      var gadget = this;
      var state = gadget.state;
      return new RSVP.Queue()
        .push(function () {
          return RSVP.all([
            state.active_list || gadget.getSetting("active_list"),
            gadget.frube_allDocs({"include_docs": true})
          ]);
        })
        .push(function (response_list) {
          var dict = gadget.property_dict;
          var data = response_list[1].data.rows;
          var root = codify(state.root_list, 0);
          var active_list = response_list[0];
          var oldest_timestamp = getTimeStamp();
          var html_content = STR;
          var query = getElem(gadget.element, ".frube-filter-input").value;

          // XXX refactor
          var playlist_data = getPlaylist(data, state, active_list);
          var playlist = playlist_data.active_list;
          var tracklist = filterTracklist(playlist_data, playlist, query);
          var len = tracklist.length;
          var queue = new RSVP.Queue();
          dict.queue_list = playlist.queue_list;
          tracklist.forEach(function (doc, pos) {
            var cover = doc.custom_cover || doc.original_cover;
            if (!doc.portal_type) {
              doc.portal_type = "track";
              dict.buffer_dict[doc.id] = doc;
            }
            if (oldest_timestamp > doc.timestamp) {
              oldest_timestamp = doc.timestamp;
            }
            html_content += getTemplate(GADGET_KLASS, "queue_template").supplant({
              "video_id": doc.id,
              "title": doc.title,
              "fallback_url": dict.observer ? STR : cover,
              "thumbnail_url": dict.observer ? cover : STR,
              "pos": doc.pos,
              "disable_first": pos === 0 ? DISABLED : STR,
              "disable_last": pos === len - 1 ? DISABLED : STR,
              "overlay": state.play === doc.id ? (OVERLAY + SPC + PLAYING) : STR
            });
          });
          if (state.play !== null) {
            setVideoControls(dict, state.play);
          }
          if (len === 0 && !setVideoHash(dict.queue_list)) {
            setDom(dict.playlist, getTemplate(GADGET_KLASS, "status_template")
              .supplant({"status": PLAYLIST}), true
            );
          } else {
            setDom(dict.playlist, html_content, true);
            observeImage(dict, dict.playlist.querySelectorAll("img"));
          }
          if (state.zero_stamp !== oldest_timestamp) {
            gadget.state.zero_stamp = oldest_timestamp;
          }
          if (Object.keys(dict.buffer_dict).length > 0) {
            queue.push(gadget.clearBuffer());
          } 
          if (playlist.id && playlist.root) {
            queue.push(gadget.stateChange({"root_list": playlist.id}));
          }
          if (my_flag === "init") {
            queue.push(gadget.stateChange({"active_list": playlist.id || root}));
          }
          if (playlist.id === undefined) {
            queue.push(gadget.createPlaylist(state.root_list, true));
          } else {
            queue.push(gadget.frube_put(playlist.id, playlist));
          }
          return queue;
        });
    })

    .declareMethod("changePlaylist", function (my_event) {
      var gadget = this;
      var dict = gadget.property_dict;
      var state = gadget.state;
      var id = my_event.target.getAttribute("data-playlist");
      if (id === state.active_list) {
        return;
      }
      return gadget.frube_get(id)
        .push(function (my_playlist) {
          dict.filter_list = my_playlist.queue_list;
          getElem(gadget.element, ".frube-dialog-playlist").close();
          return gadget.stateChange({"active_list": id, "mode": state.mode});
        });
    })

    .declareMethod("setActivePlaylist", function (my_list) {
      var gadget = this;
      var state = gadget.state;
      var promise_list = [];
      setPlaylistControl(gadget.property_dict, my_list);
      if (state.mode === SEARCHING) {
        promise_list.push(gadget.refreshSearchResults());
      }
      promise_list.push(gadget.setSetting("active_list", my_list));
      return RSVP.all(promise_list);
    })

    .declareMethod("filterPlaylist", function () {
      var gadget = this;
      var element = gadget.element;
      var target = getElem(element, ".frube-playlist-container");
      var active_list = gadget.state.active_list;
      return gadget.frube_allDocs({"include_docs": true})
        .push(function (my_response) {
          var html_content = STR;
          var query = lower(getElem(element, ".frube-playlist-input").value);
          my_response.data.rows.forEach(function (item) {
            var doc = item.doc;
            if (doc.portal_type !== PLAYLIST) {
              return;
            }
            if (noMatch(query, codify(doc.id, 1))) {
              return;
            }
            html_content += getTemplate(GADGET_KLASS, "playlist_template").supplant({
              "playlist_title": codify(doc.id, 1),
              "playlist_id": doc.id,
              "playlist_count": doc.queue_list.length,
              "playlist_active": doc.id === gadget.state.active_list ? "*" : STR,
              "disabled": doc.root ? DISABLED : STR
            });
          });
          if (html_content === STR) {
            getElem(element, ".frube-playlist-create").classList.remove(HIDDEN);
          } else {
            getElem(element, ".frube-playlist-create").classList.add(HIDDEN);
          }
          setDom(target, html_content, true);
          window.componentHandler.upgradeElements(target);
        });
    })

    .declareMethod("deletePlaylist", function (my_event) {
      var gadget = this;
      var form = my_event.target;
      var playlist_id = form.getAttribute("data-playlist");
      var entry = form.parentElement.parentElement;
      return gadget.frube_remove(playlist_id)
        .push(function () {
          entry.parentElement.removeChild(entry);
          if (gadget.state.active_list === playlist_id) {
            return gadget.stateChange({"active_list": null});
          }
        });
    })

    .declareMethod("savePlaylist", function (my_event) {
      var gadget = this;
      var current_id = my_event.target.getAttribute("data-playlist");
      var new_id = getElem(my_event.target, ".frube-playlist-name").value;
      if (new_id === STR || new_id === current_id) {
        return gadget.togglePlaylist(my_event);
      }
      return gadget.frube_get(current_id)
        .push(function (my_playlist) {
          var promise_list = [gadget.frube_remove(current_id)];
          window.document.activeElement.blur();
          my_playlist.id = codify(new_id, 0);
          promise_list.push(gadget.frube_put(codify(new_id, 0), my_playlist));
          if (my_playlist.root) {
            promise_list.push(gadget.stateChange({"root_list": new_id}));  
          }
          return RSVP.all(promise_list);
        })
        .push(function () {
          var promise_list = [gadget.filterPlaylist()];
          if (current_id === gadget.state.active_list) {
            promise_list.push(gadget.stateChange({"active_list": new_id}));
          }
          return RSVP.all(promise_list);
        });
    })

    .declareMethod("createPlaylist", function (my_id, is_root) {
      var gadget = this;
      var element = getElem(gadget.element, ".frube-playlist-filter input");
      var id = my_id || element.value;
      if (id === undefined || id === STR) {
        return;
      }
      return gadget.frube_put(codify(id, 0), {
        "portal_type": PLAYLIST,
        "queue_list": is_root ? gadget.property_dict.queue_list : [],
        "root": is_root ? true : undefined,
        "id": codify(id, 0)
      })
      .push(function () {
        if (is_root === undefined) {
          element.value = STR;
          return gadget.filterPlaylist();
        }
      });
    })

    /////////////////////////////
    // declared jobs
    /////////////////////////////
    .declareJob("togglePlaylist", function (my_event, my_new_id) {
      var gadget = this;
      var form = my_event.target;
      var entry = form.parentElement;
      var toggle_button = getElem(form, ".frube-button-toggle");
      var expander = getElem(form, ".frube-playlist-expander");
      var switch_form = getElem(entry, ".frube-playlist-switch");
      var input = getElem(expander, "input");

      // key submit, field still active, save anyway
      if (window.document.activeElement.classList.contains("frube-playlist-name")) {
        return gadget.savePlaylist(my_event);
      }

      toggle_button.classList.toggle(HIDDEN);
      getElem(entry, ".frube-playlist-save").classList.toggle(HIDDEN);
      getElem(entry, ".frube-playlist-delete").classList.toggle(HIDDEN);
      switch_form.classList.toggle(HIDDEN);
      expander.classList.add("is-focused");

      // lost focus for some reason, shrink expander, update switch button
      if (my_new_id || expander.classList.contains("is-dirty")) {
        expander.classList.remove("is-focused", "is-dirty");
        return;
      }

      // expanding, wait for blur to save
      input.focus();
      input.value = getElem(switch_form, ".mdl-button").textContent;
      return new RSVP.Queue()
        .push(function () {
          return window.promiseEventListener(input, "blur", false);
        })
        .push(function () {
          return gadget.savePlaylist(my_event);
        });
    })

    .declareJob("bufferKeyInput", function (my_event, my_input) {
      var gadget = this;
      return new RSVP.Queue()
        .push(function() {
          return RSVP.delay(500);
        })
        .push(function () {
          if (my_input === FILTER) {
            return gadget.exitSearch();
          }
          if (my_input === SEARCH) {
            gadget.state.is_searching = false;
            return gadget.enterSearch();
          }
          return gadget.filterPlaylist();
        })
        .push(function () {
          if (my_input === SEARCH) {
            return gadget.runSearch();
          }
          if (my_input === FILTER) {
            return gadget.refreshPlaylist();
          }
          return;
        });
    })

    .declareJob("waitForNetwork", function (my_video_id) {
      var gadget = this;
      var dict = gadget.property_dict;

      return gadget.stateChange({"loader": true})
        .push(function () {
          return RSVP.delay(TEN_MINUTES/40);
        })
        .push(function () {
          var status;
          if (window.navigator.onLine) {
            status = getElem(dict.search_results, "div");
            status.className = status.className.replace(OFFLINE, SEARCHING);
            return gadget.stateChange({"loader": null, "play": my_video_id, "mode": WATCHING});
          }
          return gadget.waitForNetwork(my_video_id);
        });
    })

    .declareJob("loopSlider", function () {
      var gadget = this;
      return new RSVP.Queue()
        .push(function () {
          return RSVP.delay(500);
        })
        .push(function () {
          return gadget.updateSlider();
        })
        .push(function () {
          return gadget.loopSlider();
        });
    })

    .declareJob("syncPlaylist", function () {
      var gadget = this;
      var sync_button = gadget.property_dict.sync_button;
      return new RSVP.Queue()
        .push(function () {
          sync_button.classList.add(SPIN);
          return gadget.frube_repair();
        })
        .push(function () {
          sync_button.classList.remove(SPIN);
          return gadget.refreshPlaylist("sync");
        });
    })

    /////////////////////////////
    // declared service
    /////////////////////////////
    .declareService(function () {
      var gadget = this;
      var listener = window.loopEventListener;

      function handleHash() {
        return gadget.loadVideo(getVideoHash());
      }
      function handleScroll(event) {
        if (!gadget.state.is_searching) {
          return gadget.triggerSearchFromScroll(event);
        }
      }

      return RSVP.all([
        gadget.setting_create({"type": "local", "sessiononly": false}),
        listener(window, "hashchange", false, handleHash),
        listener(gadget.property_dict.main, "scroll", false, handleScroll)
      ]);
    })

    /////////////////////////////
    // on Event
    /////////////////////////////
    // clickediclick, the less the better
    .onEvent("click", function (event) {
      var target = event.target;
      var video_id = target.getAttribute(ID);
      if (video_id) {
        return this.stateChange({"play": video_id});
      }
      switch (target.getAttribute(NAME)) {
        case "frube-video-searching":
          return this.property_dict.search_input.focus();
        case "frube-upload":
          return setFileInput(this.element, event);
      }
    }, false, false)

    .onEvent("mouseDown", function (event) {
      if (event.target.id === IS_SLIDER) {
        this.state.slider_in_use = true;
      }
    }, false, false)

    .onEvent("mouseUp", function (event) {
      if (event.target.id === IS_SLIDER) {
        this.state.slider_in_use = false;
      }
    }, false, false)

    .onEvent("change", function (event) {
      var target = event.target;
      switch (target.getAttribute(NAME)) {
        case "frube-config":
          return this.setSetting(target.getAttribute(ACTION), target.checked);
        case "frube-track-seek":
          return this.property_dict.player.seekTo(target.value, true);
        case "frube-upload":
          return updateFileInput(this.element, event);
      }
    }, false, false)

    .onEvent("input", function (event) {
      switch (event.target.getAttribute(NAME)) {
        case "frube-search-input":
          return this.bufferKeyInput(event, SEARCH);
        case "frube-filter-input":
          return this.bufferKeyInput(event, FILTER);
        case "frube-playlist-input":
          return this.bufferKeyInput(event, PLAYLIST);
      }
    }, false, false)

    .onEvent("submit", function (event) {
      switch (event.target.getAttribute(NAME)) {
        case "frube-view-switch":
          return this.stateChange({"mode": this.state.mode === SEARCHING ? WATCHING : SEARCHING});
        case "frube-connector-dropbox":
          return this.connectAndSyncWithDropbox();
        case "frube-track-remove":
          return this.removeVideo(getAttr(event, ID), event.target);
        case "frube-track-add":
          return this.addVideo(getAttr(event, ID), event.target);
        case "frube-track-front":
          return this.rankVideo(getAttr(event, ID), getAttr(event, POS), 1);
        case "frube-track-back":
          return this.rankVideo(getAttr(event, ID), getAttr(event, POS), -1);
        case "frube-track-edit":
          return this.editVideo(event, getAttr(event, ID));
        case "frube-track-play":
          return this.stateChange({"play": getAttr(event, ID)});
        case "frube-track-next":
          return this.jumpVideo(1);
        case "frube-track-previous":
          return this.jumpVideo(-1);
        case "frube-filter-source":
          return this.refreshPlaylist();
        case "frube-search-source":
          return this.runSearch();
        case "frube-trending-up":
          return this.rateVideo(getAttr(event, ID), 1);
        case "frube-trending-down":
          return this.rateVideo(getAttr(event, ID), -1);
        case "frube-sync":
          return this.syncPlaylist();
        case "frube-playlist-select":
          return this.handleDialog(event, PLAYLIST);
        case "frube-dialog":
          return this.handleDialog(event);
        case "frube-play-pause":
          return playOrPause(this.property_dict.player);
        case "frube-set-volume":
          return setVolume(this.property_dict.player, event);
        case "frube-search-more":
          return this.runSearch(true);
        case "frube-playlist-create":
          return this.createPlaylist();
        case "frube-playlist-save":
          return this.savePlaylist(event);
        case "frube-playlist-toggle":
          return this.togglePlaylist(event);
        case "frube-playlist-delete":
          return this.deletePlaylist(event);
        case "frube-playlist-switch":
          return this.changePlaylist(event);
        case "frube-track-undo":
          delete this.property_dict.buffer_dict[getAttr(event, ID)];
          break;
        case "frube-home":
          this.property_dict.main.scrollTop = 0;
          break;
      }
    }, false, true);

}(window, rJS, RSVP, YT, JSON, Blob, URL, Math, SimpleQuery, Query,
  ComplexQuery));

