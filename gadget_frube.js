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

  // fix ugly connection dropbox popup
  // refresh playlist after sync, bit by bit?

  /////////////////////////////
  // parameters
  /////////////////////////////
  var ACTION = "data-action";
  var ADD = "playlist_add";
  var AND = " - ";
  var ARR = [];
  var BUTTON = "button";
  var CLOSE = "frube-dialog-close";
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
  var POS = "data-position";
  var QUALITY = ".frube-btn-quality";
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

  /////////////////////////////
  // methods
  /////////////////////////////
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

  function getFrubeConfig(my_token) {
    if (my_token) {
      return {
        "type": "replicate",
        "parallel_operation_amount": 6,
        "check_local_modification": true,
        "check_local_creation": true,
        "check_local_deletion": true,
        "conflict_handling": 1,
        "local_sub_storage": {
          "type": "indexeddb",
          "database": "frube"
        },
        "remote_sub_storage": {
          "type": "query",
          "sub_storage": {
            "type": "drivetojiomapping",
            "sub_storage": {
              "type": "dropbox",
              "access_token": my_token,
              "root": "sandbox"
            }
          }
        }
      };
    }
    return {"type": "indexeddb", "database": "frube"};
  }

  function getTubeConfig(my_id) {
    return {"type": "youtube", "api_key": my_id};
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

  // https://stackoverflow.com/a/39336206/
  function isConstructor(value) {
    try {
      new new Proxy(value, {construct() { return {}; }});
      return true;
    } catch (err) {
      return false;
    }
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

  function unsetBufferDict(my_dict, my_video) {
    delete my_dict.buffer_dict[my_video];
    if (Object.keys(my_dict.search_result_dict).length === 0) {
      my_dict.sync_button.setAttribute(DISABLED, DISABLED);
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

  function swapVideo(my_element, my_id) {
    var current_video = getVideo(my_element, my_id);
    var next_video = getVideo(my_element, getVideoHash());
    if (current_video) {
      setOverlay(current_video, PLAYING, "remove");
    }
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
      "title": item.snippet.title,
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

  GADGET_KLASS

    /////////////////////////////
    // state
    /////////////////////////////
    .setState({
      zero_stamp: null,
      scroll_trigger: 300,
      scroll_buffer: 250,
      filter_buffer: 500,
      slider_interval: 500,
      mode: WATCHING,
      search_time: null,
      video_duration: null,
      last_main_pos: 0,
      next_page_token: null,
      slider_in_use: false,
      is_searching: false,
      play: null,
      quality: LO,
      flag_sync: false,
      dropbox_connected: null
    })

    /////////////////////////////
    // ready
    /////////////////////////////
    .ready(function () {
      var gadget = this;
      var element = gadget.element;

      gadget.property_dict = {
        search_result_dict: {},
        buffer_dict: {},
        queue_list: [],
        player: null,
        current_video: null,
        search_input: getElem(element, ".frube-search-input"),
        dropbox_button: getElem(element,  ".frube-connector-dropbox"),
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

      return gadget.setRemoteConnection()
        .push(function () {
          return RSVP.all([
            gadget.tube_create(getTubeConfig(dict.youtube_id)),
            gadget.refreshPlaylist(),
            gadget.updateSettings()
          ]);
        })
        .push(function () {
          var video = getVideoHash() || dict.queue_list[0] || null;
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

    .declareMethod("setRemoteConnection", function () {
      var gadget = this;
      return gadget.getSetting("token")
        .push(function (token) {
          var payload = JSON.parse(token);
          if (!payload || (getTimeStamp() - payload.timestamp > TEN_MINUTES)) {
            setButtonIcon(gadget.property_dict.sync_button, "sync_disabled");
            gadget.state.dropbox_connected = null;
            return RSVP.all([
              gadget.setting_removeAttachment("/", "token"),
              gadget.frube_create(getFrubeConfig())
            ]);
          }
          return new RSVP.Queue()
            .push(function () {
              gadget.state.dropbox_connected = true;
              return gadget.frube_create(getFrubeConfig(payload.token));
            })
            .push(function () {
              var dict = gadget.property_dict;
              setButtonIcon(dict.dropbox_button, "done");
              setButtonIcon(dict.sync_button, "sync");
              dict.sync_button.removeAttribute(DISABLED);
              return gadget.syncPlaylist();
            });
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
      var element = gadget.element;
      var tube_data = {"items": ARR};

      if (!window.navigator.onLine) {
        return gadget.handleError({"resume": my_video_id});
      }

      return new RSVP.Queue()
        .push(function () {
          var hd_check = getElem(element, QUALITY).checked;
          var state = gadget.state;

          if (state.quality === LO && hd_check) {
            dict.player.destroy();
            gadget.state.quality = HI;
          }
          if (state.quality === HI && !hd_check) {
            dict.player.destroy();
            gadget.state.quality = LO;
          }
          return;
        })
        .push(function () {
          return gadget.throttleQueueForDependencies(YT.Player);
        })
        .push(function () {
          var player = dict.player;
          var main = dict.main;
          if (!player || (player && !player.h)) {
            dict.player = new YT.Player("player", {
              "videoId": my_video_id,
              "width": main.clientWidth,
              "height": Math.max(main.clientWidth * 0.66 * 9 / 16, 250),
              "events": {
                "onReady": function (event) {
                  event.target.playVideo();
                },
                "onStateChange": function (event) {
                  return gadget.videoOnStateChange();
                },
                "onError": function (event) {
                  return gadget.handleError(event);
                }
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
          } else {
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
          var item = dict.current_video = tube_data.items[0];
          if (item) {
            window.document.title = item.snippet.title;
            dict.current_video.score = getScore(data.upvote_list, data.downvote_list, gadget.state.zero_stamp);
            setVideoControls(dict, my_video_id);
            setVideoSlider(dict.video_slider, item.contentDetails);
          }
          return;
        })
        .push(undefined, function (error) {
          throw error;
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

      return new RSVP.Queue()
        .push(function () {
          var queue_list = dict.queue_list;
          var len = queue_list.length;
          var new_id;
          var i;

          if (!my_jump && len > 0) {
            return gadget.getRandomId();
          }
          for (i = 0; i < len; i += 1) {
            if (queue_list[i] === gadget.state.play) {
              new_id = queue_list[i + my_jump];
            }
          }
          if (new_id) {
            return new_id;
          }
          if (my_jump < 0) {
            return queue_list[len - 1];
          }
          return null;
        });
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
            gadget.stateChange({"blur": true, "flag_sync": true})
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
      dict.search_result_dict = {};
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
        unsetBufferDict(dict, my_video_id);
      } else {
        dict.buffer_dict[my_video_id] = undefined;
        setButtonIcon(getElem(my_element, BUTTON), UNDO);
        setOverlay(getVideo(dict.playlist, my_video_id), DELETED, "add");  
      }
      if (gadget.state.mode === WATCHING) {
        setVideoControls(dict, gadget.state.play);
      }
      return gadget.stateChange({"blur": true});
    })

    .declareMethod("handleDialog", function (my_event, my_action, my_focus) {
      var gadget = this;
      var action = my_action || my_event.target.getAttribute(ACTION);
      var dialog = getElem(gadget.element, (DIALOG + action));
      var active_element = window.document.activeElement;
      var promise_list = [];
      var input;
      var video_id;

      if (active_element && active_element.classList.contains(CLOSE)) {
        dialog.close();
        return;
      }
      if (!dialog.open) {
        if (!dialog.showModal) {
          DIALOG_POLYFILL.registerDialog(dialog);
        }
        dialog.showModal();
        return;
      }

      if (action === "edit") {
        video_id = getAttr(event, ID);

        promise_list.push(new RSVP.Queue()
          .push(function () {
            return gadget.frube_get(video_id);
          })
          .push(function (video) {
            video.custom_title = getElem(dialog, ".frube-edit-title").value;
            video.custom_album = getElem(dialog, ".frube-edit-album").value;
            video.custom_artist = getElem(dialog, ".frube-edit-artist").value;
            video.custom_cover = getElem(dialog, ".frube-edit-cover").value;
            dialog.close();
            return RSVP.all([
              gadget.frube_put(video_id, video),
              gadget.stateChange({"blur": true}),
              gadget.refreshPlaylist()
            ]);
          })
        );
      }
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
      var meta = dict.search_result_dict[my_video_id] || dict.current_video;
      if (dict.buffer_dict.hasOwnProperty(my_video_id)) {
        setButtonIcon(getElem(my_element, BUTTON), ADD);
        setOverlay(getVideo(dict.search_results, my_video_id), LISTED, "remove");
        unsetBufferDict(dict, my_video_id);
      } else {
        setButtonIcon(getElem(my_element, BUTTON), UNDO);
        setOverlay(getVideo(dict.search_results, my_video_id), LISTED, "add");

        // stack for storing
        dict.buffer_dict[my_video_id] = {
          "id": my_video_id,
          "type": meta.id.kind,
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
      var promise_list = [];
      var play = gadget.state.play;
      var id;
      var show_sync;

      for (id in buffer) {
        if (buffer.hasOwnProperty(id)) {
          if (buffer[id]) {
            promise_list.push(gadget.frube_put(id, buffer[id]));
          } else {
            promise_list.push(gadget.frube_remove(id));
            dict.queue_list = unsetQueueList(id, dict.queue_list);
          }
          delete buffer[id];
        }
      }
      show_sync = promise_list.length > 0 || false;
      if (show_sync && !gadget.state.flag_sync) {
        promise_list.push(gadget.stateChange({"flag_sync": show_sync}));
      }
      return RSVP.all(promise_list);
    })

    .declareMethod("refreshPlaylist", function () {
      var gadget = this;
      var dict = gadget.property_dict;
      var state = gadget.state;
      var query = getElem(gadget.element, ".frube-filter-input").value;
      return gadget.frube_allDocs({"include_docs": true})
        .push(function (my_response) {
          var len = my_response.data.total_rows;
          var oldest_timestamp = getTimeStamp();
          var html_content = STR;
          var response = my_response.data.rows.map(function (item) {
            var doc = item.doc;

            // filter replication records hash
            if (!doc.original_title) {
              return;
            }

            doc.title = [
              doc.custom_artist,
              (doc.custom_title || doc.original_title),
              doc.custom_album
            ].filter(Boolean).join(AND);

            // filter playlist
            if (query !== STR && doc.title.toLowerCase().indexOf(query.toLowerCase()) === -1) {
              return;
            }

            doc.id = doc.id || item.id;
            return doc;
          }).filter(Boolean).sort(dynamicSort("-pos"));

          dict.queue_list = [];
          response.forEach(function (doc, pos) {
            var play = state.play;
            dict.queue_list.push(doc.id);
            if (oldest_timestamp > doc.timestamp) {
              oldest_timestamp = doc.timestamp;
            }
            html_content += getTemplate(GADGET_KLASS, "queue_template").supplant({
              "video_id": doc.id,
              "title": doc.title,
              "thumbnail_url": doc.custom_cover || doc.original_cover,
              "pos": doc.pos,
              "disable_first": pos === 0 ? DISABLED : STR,
              "disable_last": pos === len - 1 ? DISABLED : STR,
              "overlay": play === doc.id ? (OVERLAY + SPC + PLAYING) : STR
            });
          });
          if (state.play !== null) {
            setVideoControls(dict, state.play);
          }
          if (len === 0 && !getVideoHash()) {
            setDom(dict.playlist, getTemplate(GADGET_KLASS, "status_template")
              .supplant({"status": "playlist"}), true
            );
          } else {
            setDom(dict.playlist, html_content, true);
          }
          if (state.zero_stamp !== oldest_timestamp) {
            gadget.state.zero_stamp = oldest_timestamp;
          }
          return gadget.clearBuffer();
        });
    })

    .declareMethod("refreshSearchResults", function () {
      var gadget = this;
      var dict = gadget.property_dict;
      var catalog = dict.search_result_dict;
      var list = dict.queue_list;
      var response = STR;
      var item_id;
      var item;
      var video_id;
      var is_listed;
      for (item_id in catalog) {
        if (catalog.hasOwnProperty(item_id)) {
          item = catalog[item_id];
          video_id = item.id.videoId;
          is_listed = list.indexOf(video_id) > -1;
          response += getTemplate(GADGET_KLASS, "search_template").supplant({
            "video_id": video_id,
            "title": item.snippet.title,
            "thumbnail_url": item.snippet.thumbnails.medium.url,
            "overlay": is_listed ? (OVERLAY + SPC + LISTED) : STR,
            "disabled": is_listed ? DISABLED : STR,
            "class": is_listed ? OPAQUE : STR
          });
        }
      }
      if (response !== STR) {
        response += getTemplate(GADGET_KLASS, "load_template".supplant());
        setDom(dict.search_results, response, true);
      }
      if (gadget.state.play !== null) {
        setVideoControls(dict, gadget.state.play);
      }
      return gadget.clearBuffer();
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

    .declareMethod("connectAndSyncWithDropbox", function(my_token) {
      var gadget = this;
      var dict = gadget.property_dict;
      var token = my_token || dict.dropbox_id;

      return gadget.getDeclaredGadget("dropbox")
        .push(function (my_dropbox_gadget) {
          return my_dropbox_gadget.setDropbox(token);
        })
        .push(function (my_oauth_dict) {
          var token = my_oauth_dict.access_token;
          gadget.state.dropbox_connected = true;
          return RSVP.all([
            gadget.frube_create(getFrubeConfig(token)),
            gadget.setSetting("token", token)
          ]);
        })
        .push(function () {
          setButtonIcon(dict.dropbox_button, "done");
          setButtonIcon(dict.sync_button, "sync");
          return RSVP.all([
            gadget.syncPlaylist(),
            gadget.stateChange({"mode": WATCHING})
          ]);
        })
        .push(undefined, function (connection_error) {
          return gadget.handleError(connection_error);
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
          height_trigger = main_pos + main.clientHeight + state.scroll_trigger;
          if (height_trigger >= main.scrollHeight) {
            sec_trigger = getTimeStamp() - state.search_time > state.scroll_buffer;
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
        return;
      }
      if (!my_next_page) {
        dict.search_result_dict = {};
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
            dict.search_result_dict[item.id.videoId] = item;
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
          unsetLoader(dict.action_button);
          if (error.target && error.target.status === 400) {
            return gadget.handleError(JSON.parse(error.target.response).error);
          }
          gadget.state.is_searching = false;
        });
    })

    .declareMethod("stateChange", function (modification_dict) {
      var gadget = this;
      var dict = gadget.property_dict;
      var video_hash;
      if (modification_dict.hasOwnProperty("blur")) {
        window.document.activeElement.blur();
      }
      if (modification_dict.hasOwnProperty("loader")) {
        if (modification_dict.loader) {
          setLoader(dict.action_button);
        } else {
          unsetLoader(dict.action_button);
        }
      }
      if (modification_dict.hasOwnProperty("flag_sync")) {
        gadget.state.flag_sync = modification_dict.flag_sync;
        if (modification_dict.flag_sync && gadget.state.dropbox_connected) {
          dict.sync_button.removeAttribute(DISABLED);
        }
      }
      if (modification_dict.hasOwnProperty("play")) {
        gadget.state.play = modification_dict.play;
        video_hash = getVideoHash();
        if (modification_dict.play === video_hash) {
          return gadget.loadVideo(video_hash);
        }
        if (modification_dict.play === null) {
          dict.video_controller.classList.add(HIDDEN);
        } else {
          window.location.hash = modification_dict.play;
          swapVideo(dict.playlist, video_hash);
          dict.video_controller.classList.remove(HIDDEN);
        }
      }
      if (modification_dict.hasOwnProperty("mode")) {
        gadget.state.mode = modification_dict.mode;
        dict.main.scrollTop = 0;
        if (modification_dict.mode === SEARCHING) {
          setButtonIcon(getElem(dict.action_container, BUTTON), PLAY);
          dict.playlist_menu.classList.add(HIDDEN);
          dict.playlist.classList.add(HIDDEN);
          dict.player_container.classList.add(HIDDEN);
          dict.player_controller.classList.remove(HIDDEN);
          dict.search_results.classList.remove(HIDDEN);
          dict.search_input.focus();
          return gadget.refreshSearchResults();
        } else {
          setButtonIcon(getElem(dict.action_container, BUTTON), SEARCH);
          dict.playlist_menu.classList.remove(HIDDEN);
          dict.playlist.classList.remove(HIDDEN);
          dict.search_results.classList.add(HIDDEN);
          dict.player_controller.classList.add(HIDDEN);
          dict.player_container.classList.remove(HIDDEN);
          return gadget.refreshPlaylist();
        }
      }
      return;
    })

    .declareMethod("updateSettings", function () {
      var gadget = this;
      return RSVP.all(
        ARR.slice.call(
          gadget.property_dict.playlist_menu.querySelectorAll('[type="checkbox"]')
        ).map(function (box) {
            var action = box.getAttribute(ACTION);
            return gadget.getSetting(action)
              .push(function (my_response) {
                var payload = JSON.parse(my_response);
                box.checked = !payload ? false : payload[action] || false;
                box.parentElement.MaterialSwitch.checkToggleState();
              });
          })
        );
    })

    .declareMethod("getSetting", function (my_setting) {
      var gadget = this;
      return gadget.setting_getAttachment("/", my_setting, {format: "text"})
        .push(undefined, gadget.handleError);
    })

    .declareMethod("setSetting", function (my_setting, my_value) {
      var payload = {"timestamp": getTimeStamp()};
      payload[my_setting] = my_value;
      return this.setting_putAttachment("/", my_setting, new Blob([
        JSON.stringify(payload)
      ], {type: "text/plain"}));
    })

    /////////////////////////////
    // declared jobs
    /////////////////////////////
    .declareJob("bufferKeyInput", function (my_event, my_input) {
      var gadget = this;
      var state = gadget.state;
      // new key inputs will cancel previous job unless there was a 500ms lag
      return new RSVP.Queue()
        .push(function() {
          return RSVP.delay(state.filter_buffer);
        })
        .push(function () {
          if (my_input === SEARCH) {
            return gadget.enterSearch();
          }
          return gadget.exitSearch();
        })
        .push(function () {
          if (my_input === SEARCH) {
            return gadget.runSearch();
          }
          return gadget.refreshPlaylist();
        });
    })

    .declareJob("throttleQueueForDependencies", function (my_dependency) {
      var gadget = this;
      if (isConstructor(my_dependency)) {
        return;
      }
      return new RSVP.Queue()
        .push(function () {
          return RSVP.delay(gadget.property_dict.scroll_buffer);
        })
        .push(function () {
          return gadget.throttleQueueForDependencies(my_dependency);
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

    .declareJob("syncPlaylist", function () {
      var gadget = this;
      var sync_button = gadget.property_dict.sync_button;
      return new RSVP.Queue()
        .push(function () {
          sync_button.classList.add(SPIN);
          return RSVP.all([
            gadget.frube_repair(),
            gadget.refreshPlaylist()
          ]);
        })
        .push(function () {
          sync_button.classList.remove(SPIN);
          sync_button.setAttribute(DISABLED, DISABLED);
          return gadget.stateChange({"flag_sync": false});
        });
    })

    /////////////////////////////
    // declared service
    /////////////////////////////
    .declareService(function () {
      var gadget = this;
      var listener = window.loopEventListener;

      function handleHash() {
        var video_id = getVideoHash();
        if (video_id) {
          return gadget.loadVideo(video_id);
        }
      }

      function handleScroll(event) {
        return gadget.triggerSearchFromScroll(event);
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
        case "frube-connector-dropbox":
          return this.connectAndSyncWithDropbox();
        case "frube-view-switch":
          return this.stateChange({"mode": this.state.mode === SEARCHING ? WATCHING : SEARCHING});
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
      }
    }, false, false)

    .onEvent("submit", function (event) {
      switch (event.target.getAttribute(NAME)) {
        case "frube-playlist-remove":
          return this.removeVideo(getAttr(event, ID), event.target);
        case "frube-playlist-add":
          return this.addVideo(getAttr(event, ID), event.target);
        case "frube-playlist-front":
          return this.rankVideo(getAttr(event, ID), getAttr(event, POS), 1);
        case "frube-playlist-back":
          return this.rankVideo(getAttr(event, ID), getAttr(event, POS), -1);
        case "frube-playlist-edit":
          return this.editVideo(event, getAttr(event, ID));
        case "frube-playlist-play":
          return this.stateChange({"play": getAttr(event, ID)});
        case "frube-playlist-next":
          return this.jumpVideo(1);
        case "frube-playlist-previous":
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
        case "frube-dialog":
          return this.handleDialog(event);
        case "frube-play-pause":
          return playOrPause(this.property_dict.player);
        case "frube-set-volume":
          return setVolume(this.property_dict.player, event);
        case "frube-search-more":
          return this.runSearch(true);
        case "frube-home":
          this.property_dict.main.scrollTop = 0;
          break;
        case "frube-playlist-undo":
          delete this.property_dict.buffer_dict[getAttr(event, ID)];
          break;
      }
    }, false, true);

}(window, rJS, RSVP, YT, JSON, Blob, URL, Math, SimpleQuery, Query,
  ComplexQuery));
