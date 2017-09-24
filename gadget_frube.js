/*jslint nomen: true, indent: 2 */
/*global window, rJS, RSVP, YT, JSON, Blob, FormData, URL, Math */
(function (window, rJS, RSVP, YT, JSON, Blob, FormData, URL, Math) {
    "use strict";

  // KUDOS: https://github.com/boramalper/Essential-YouTube
  // https://developers.google.com/youtube/iframe_api_reference
  // https://developers.google.com/youtube/player_parameters?playerVersion=HTML5
  // https://getmdl.io/components/index.html

  /////////////////////////////
  // parameters
  /////////////////////////////
  var ARR = [];
  var STR = "";
  var SPC = " ";
  var AND = " - ";
  var POS = "data-position";
  var ID = "data-video";
  var ACTION = "data-action";
  var DELETE = "delete";
  var ATTACH = "attach_file";
  var BUTTON = "button";
  var CLOSE = "frube-dialog-close";
  var DIALOG = ".frube-dialog-";
  var IS_SLIDER = "slider";
  var UPLOAD = "frube-upload";
  var OVERLAY = "frube-overlay";
  var CONFIGURE = "configure";
  var FORBIDDEN = 403;
  var QUOTA = "quotaExceeded";
  var ERR_QUOTA = "(Quota exceeded)&nbsp;";
  var SECTION = "section";
  var ICON = "i";
  var PLAYING = "frube-video-playing";
  var LISTED = "frube-video-listed";
  var DELETED = "frube-video-deleted";
  var DISABLED = "disabled";
  var MINUS = "-";
  var LO = "tiny";
  var HI = "hd720";
  var FILTER = "filter";
  var REMOVE = "delete_sweep";
  var NAME = "name";
  var PLAY = "library_music";
  var SEARCH = "search";
  var ADD = "playlist_add";
  var UNDO = "undo_edit";
  var NONDO = "frube-can-undo";
  var SEARCHING = "searching";
  var WATCHING = "watching";
  var OFFLINE = "offline";
  var SLIDER = "frube-slider";
  var HIDDEN = "frube-hidden";
  var REPEAT = ".frube-btn-repeat";
  var QUALITY = ".frube-btn-quality";
  var SHUFFLE = ".frube-btn-shuffle";
  var SEARCH_INPUT = ".frube-search-input";
  var FILTER_INPUT = ".frube-filter-input";
  var SUBMIT = ".frube-dialog-submit";
  var PLACEHOLDER = "placeholder.png";
  var LIKE = ".frube-like";
  var OPAQUE = "frube-disabled";
  var SPIN = "frube-spin";
  var TEN_MINUTES = 600000;

  var GADGET_KLASS = rJS(window);
  var VIDEO_TEMPLATE = getTemplate(GADGET_KLASS, "video_template");
  var QUEUE_TEMPLATE = getTemplate(GADGET_KLASS, "queue_template");
  var SEARCH_TEMPLATE = getTemplate(GADGET_KLASS, "search_template");
  var EDIT_TEMPLATE = getTemplate(GADGET_KLASS, "edit_template");
  var STATUS_TEMPLATE = getTemplate(GADGET_KLASS, "status_template");

  /////////////////////////////
  // methods
  /////////////////////////////
  function getTemplate(my_klass, my_id) {
    return my_klass.__template_element.getElementById(my_id).innerHTML;
  }

  function makeList(my_nodeList) {
    return ARR.slice.call(my_nodeList);
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

  function setOverlay(my_element, my_class_flag) {
    my_element.classList.add(OVERLAY, my_class_flag);
  }

  function unsetOverlay(my_element, my_class_flag) {
    my_element.classList.remove(OVERLAY, my_class_flag);
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
    makeList(faux_element.children).forEach(function (element) {
      my_node.appendChild(element);
    });
  }

  function getScore(my_list, my_zero_stamp) {
    var now = getTimeStamp();
    var age =  now - my_zero_stamp;

    return (my_list || ARR).reduce(function (points, up_timestamp) {
      return points + (1 - (now - up_timestamp)/age);
    }, 0);
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

  function unsetBufferDict(my_dict, my_video) {
    delete my_dict.buffer_dict[my_video];
    if (Object.keys(my_dict.search_result_dict).length === 0) {
      dict.sync_button.setAttribute(DISABLED, DISABLED);
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
      unsetOverlay(current_video, PLAYING);
    }
    if (next_video) {
      setOverlay(next_video, PLAYING);
    }
  }

  GADGET_KLASS

    /////////////////////////////
    // state
    /////////////////////////////
    .setState({
      zero_stamp: null,
      scroll_trigger: 300,
      scroll_buffer: 250,
      search_buffer: 500,
      slider_interval: 500,
      mode: WATCHING,
      search_time: null,
      video_duration: null,
      last_key_stroke: null,
      last_main_pos: 0,
      next_page_token: null,
      slider_in_use: false,
      is_searching: false,
      play: null,
      quality: LO,
      flag_sync: null,
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
        error_status: getElem(element, ".frube-error"),
        dropbox_button: getElem(element,  ".frube-connector-dropbox"),
        action_container: getElem(element, ".frube-action"),
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
    // frube bridge
    .declareMethod("frube_create", function (my_option_dict) {
      return this.getDeclaredGadget("frube_jio")
        .push(function (my_gadget) {
          return my_gadget.createJIO(my_option_dict);
        });
    })
    .declareMethod("frube_repair", function () {
      return this.getDeclaredGadget("frube_jio")
        .push(function (my_gadget) {
          return my_gadget.repair();
        });
    })
    .declareMethod("frube_allDocs", function (my_option_dict) {
      return this.getDeclaredGadget("frube_jio")
        .push(function (my_gadget) {
          return my_gadget.allDocs(my_option_dict);
        });
    })
    .declareMethod("frube_put", function (my_id, my_dict) {
      return this.getDeclaredGadget("frube_jio")
        .push(function (my_gadget) {
          return my_gadget.put(my_id, my_dict);
        });
    })
    .declareMethod("frube_get", function (my_id) {
      return this.getDeclaredGadget("frube_jio")
        .push(function (my_gadget) {
          return my_gadget.get(my_id);
        });
    })
    .declareMethod("frube_remove", function (my_id) {
      return this.getDeclaredGadget("frube_jio")
        .push(function (my_gadget) {
          return my_gadget.remove(my_id);
        });
    })

    // tube bridge
    .declareMethod("tube_create", function (my_option_dict) {
      return this.getDeclaredGadget("tube_jio")
        .push(function (my_gadget) {
          return my_gadget.createJIO(my_option_dict);
        });
    })
    .declareMethod("tube_allDocs", function (my_option_dict) {
      return this.getDeclaredGadget("tube_jio")
        .push(function (my_gadget) {
          return my_gadget.allDocs(my_option_dict);
        });
    })
    .declareMethod("tube_get", function (my_id) {
      return this.getDeclaredGadget("tube_jio")
        .push(function (my_gadget) {
          return my_gadget.get(my_id);
        });
    })

    // token bridge
    .declareMethod("token_create", function (my_option_dict) {
      return this.getDeclaredGadget("token_jio")
        .push(function (my_gadget) {
          return my_gadget.createJIO(my_option_dict);
        });
    })
    .declareMethod("token_getAttachment", function (my_id, my_tag) {
      return this.getDeclaredGadget("token_jio")
        .push(function (my_gadget) {
          return my_gadget.getAttachment(my_id, my_tag);
        });
    })
    .declareMethod("token_putAttachment", function (my_id, my_tag, my_dict) {
      return this.getDeclaredGadget("token_jio")
        .push(function (my_gadget) {
          return my_gadget.putAttachment(my_id, my_tag, my_dict);
        });
    })
    .declareMethod("token_removeAttachment", function (my_id, my_tag) {
      return this.getDeclaredGadget("token_jio")
        .push(function (my_gadget) {
          return my_gadget.removeAttachment(my_id, my_tag);
        });
    })

    .declareMethod("render", function (my_option_dict) {
      var gadget = this;
      var dict = gadget.property_dict;
      var video = getVideoHash() || dict.queue_list[0];

      // apply material design to injected DOM - lone heavy duty call
      window.componentHandler.upgradeDom();
      mergeDict(dict, my_option_dict);

      return new RSVP.Queue()
        .push(function () {
          return gadget.setRemoteConnection();
        })
        .push(function () {
          return gadget.tube_create({"type": "youtube", "api_key": dict.youtube_id});
        })
        .push(function () {
          if (video) {
            return gadget.changeState({"play": video});
          }
          return;
        })
        .push(function () {
          return gadget.refreshPlaylist();
        })
        .push(function () {
          if (video) {
            return;
          }
          if (!video && dict.queue_list && dict.queue_list.length > 0) {
            return gadget.changeState({"play": dict.queue_list[0]});
          }
          return gadget.enterSearch();
        });
    })

    .declareMethod("setRemoteConnection", function () {
      var gadget = this;

      return new RSVP.Queue()
        .push(function () {
          return gadget.token_create({"type": "local", "sessiononly": false});
        })
        .push(function () {
          return gadget.token_getAttachment("/", "token", {"format": "text"});
        })
        .push(undefined, function (error) {
          if (error.status_code === 404) {
            return 0;
          }
          throw error;
        })
        .push(function (token) {
          var payload = JSON.parse(token);
          if (!payload || (getTimeStamp() - payload.timestamp > TEN_MINUTES)) {
            setButtonIcon(gadget.property_dict.sync_button, "sync_disabled");
            return RSVP.all([
              gadget.token_removeAttachment("/", "token"),
              gadget.changeState({"dropbox_connected": null}),
              gadget.frube_create(getFrubeConfig())
            ]);
          }
          return new RSVP.Queue()
            .push(function () {
              return RSVP.all([
                gadget.frube_create(getFrubeConfig(payload.token)),
                gadget.changeState({"dropbox_connected": true})
              ]);
            })
            .push(function () {
              var dict = gadget.property_dict;
              setButtonIcon(dict.dropbox_button, "done");
              setButtonIcon(dict.sync_button, "sync");
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

      // XXX try to catch and handle
      throw my_error;
    })

    .declareMethod("loadVideo", function (my_video_id) {
      var gadget = this;
      var dict = gadget.property_dict;
      var element = gadget.element;
      var tube_data;

      if (!window.navigator.onLine) {
        return gadget.handleError({"resume": my_video_id});
      }

      return new RSVP.Queue()
        .push(function () {
          var hd_check = getElem(element, QUALITY).checked;
          var state = gadget.state;

          if (state.quality === LO && hd_check) {
            dict.player.destroy();
            return gadget.changeState({"quality": HI});
          }
          if (state.quality === HI && !hd_check) {
            dict.player.destroy();
            return gadget.changeState({"quality": LO});
          }
          return;
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
                "onStateChange": function () {
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
                "vq": gadget.state.quality
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
          throw error;
        })
        .push(function (frube_response) {
          var frube_data = frube_response;
          var info = dict.video_info;
          var item = dict.search_result_dict[my_video_id] = tube_data.items[0];
          var score = getScore(frube_data.upvote_list, frube_data.timestamp) -
            getScore(frube_data.downvote_list, frube_data.timestamp);

          setDom(info, VIDEO_TEMPLATE.supplant({
            "title": item.snippet.title,
            "video_id": my_video_id,
            "views": parseInt(item.statistics.viewCount, 10).toLocaleString(),
            "score": score.toFixed(5)
          }), true);

          window.document.title = item.snippet.title;
          setVideoSlider(dict.video_slider, item.contentDetails);
          setViewsSlider(getElem(info, LIKE), score);
          return;
        })
        .push(undefined, function (error) {
          if (error.type === FORBIDDEN && error.detail === QUOTA) {
            dict.error_status.textContent = ERR_QUOTA;
            dict.error_status.classList.remove(HIDDEN);
            getElem(element, ".frube-dialog-configure").showModal();
          }
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
          var zero = gadget.state.zero_stamp;

          my_result_list.reduce(function (total, item) {
            var up_list = item.upvote_list;
            var down_list = item.downvote_list;
            var ups = (getScore(up_list, zero)/up_list.length) || 0;
            var downs = (getScore(item.down_list, zero)/down_list.length) || 0;
            var score = ups - downs;

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
          return queue_list[0];
        });
    })

    .declareMethod("rankVideo", function (my_id, my_pos, my_shift) {
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
          return RSVP.all([
            gadget.changeState({"flag_sync": true}),
            gadget.refreshPlaylist()
          ]);
        });
    })

    .declareMethod("rateVideo", function (my_id, my_direction) {
      var gadget = this;
      var dict = gadget.property_dict;
      return new RSVP.Queue()
        .push(function () {
          return gadget.frube_get(my_id);
        })
        .push(function (video) {
          var score;
          if (my_direction > 0) {
            video.upvote_list.push(getTimeStamp());
          } else {
            video.downvote_list.push(getTimeStamp());
          }
          score = getScore(video.upvote_list, video.timestamp) -
            getScore(video.downvote_list, video.timestamp);
          getElem(gadget.element, ".frube-like-count").textContent = score.toFixed(5);
          setViewsSlider(getElem(dict.video_info, ".frube-like"), score);
          return RSVP.all([
            gadget.frube_put(my_id, video),
            gadget.changeState({"flag_sync": true})
          ]);
        });
    })

    .declareMethod("videoOnStateChange", function () {
      var gadget = this;
      var player = gadget.property_dict.player;
      var current_state = player.getPlayerState();
      var play_icon = getElem(gadget.element, ".frube-btn-play-pause i");

      if (current_state === YT.PlayerState.ENDED) {
        if (gadget.element.querySelector(REPEAT).checked) {
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
      var player = dict.player;

      window.location.hash = STR;
      getElem(gadget.element, SEARCH_INPUT).value = STR;
      if (!player || (player && !player.h)) {
        dict.player.stopVideo();
        dict.player.destroy();
      }
      dict.search_result_dict = {};
      dict.video_controller.classList.add(HIDDEN);
      dict.player_controller.classList.add(HIDDEN);
      purgeDom(dict.video_info);
      setDom(dict.search_results, STATUS_TEMPLATE.supplant({
        "status": my_offline ? OFFLINE : SEARCHING
      }), true);
      return RSVP.all([
        gadget.refreshSearchResults(),
        gadget.enterSearch(),
        gadget.changeState({"play": null})
      ]);
    })

    .declareMethod("removeVideo", function (my_video_id, my_element) {
      var gadget = this;
      var dict = gadget.property_dict;
      var video;

      // undo = unflag for deletion
      if (dict.buffer_dict.hasOwnProperty(my_video_id)) {
        setButtonIcon(getElem(my_element, BUTTON), REMOVE);
        unsetOverlay(getVideo(dict.playlist, my_video_id), DELETED);
        unsetBufferDict(dict, my_video_id);
      } else {
        dict.buffer_dict[my_video_id] = undefined;

        // player removes are permanent
        if (!getElem(my_element, BUTTON).classList.contains(NONDO)) {
          video = getVideo(my_element, my_video_id);
          // XXX not sure why this fails
          if (video) {
            video.parentElement.removeChild(video);
          }
          if (dict.queue_list.length === 0) {
            return gadget.resetFrube();
          }
          return gadget.jumpVideo(1);
        }
        setButtonIcon(getElem(my_element, BUTTON), UNDO);
        setOverlay(getVideo(dict.playlist, my_video_id), DELETED);
      }
      return;
    })

    .declareMethod("handleDialog", function (my_event) {
      var gadget = this;
      var action = my_event.target.getAttribute(ACTION);
      var dialog = getElem(gadget.element, (DIALOG + action));
      var active_element = window.document.activeElement;
      var video_id;
      var form_data;

      if (active_element && active_element.classList.contains(CLOSE)) {
        dialog.close();
        return;
      }
      if (!dialog.open) {
        dialog.showModal();
        return;
      }
      if (action === "edit") {
        video_id = getAttr(event, ID);
        form_data = new FormData(my_event.target);

        return new RSVP.Queue()
          .push(function () {
            return gadget.frube_get(video_id);
          })
          .push(function (video) {
            video.custom_title = form_data.get("frube-edit-custom-title");
            video.custom_album = form_data.get("frube-edit-custom-album");
            video.custom_artist = form_data.get("frube-edit-custom-artist");
            video.custom_cover = form_data.get("frube-edit-custom-cover");
            dialog.close();
            return RSVP.all([
              gadget.frube_put(video_id, video),
              gadget.changeState({"flag_sync": true})
            ]);
          })
          .push(function () {
            return gadget.refreshPlaylist();
          });
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
          .push(function (video_data) {
            setDom(getElem(dialog, ".frube-dialog-content"),
              EDIT_TEMPLATE.supplant({
                "video_title": video_data.custom_title,
                "video_artist": video_data.custom_artist,
                "video_album": video_data.custom_album,
                "video_cover": video_data.custom_cover || PLACEHOLDER
              }), true);
            window.componentHandler.upgradeElements(dialog);
            return;
          })
          .push(function () {
            getElem(gadget.element, (DIALOG + action)).showModal();
          });
      }
    })

    .declareMethod("addVideo", function (my_video_id, my_element) {
      var gadget = this;
      var dict = gadget.property_dict;
      var video_dict = dict.search_result_dict[my_video_id];
      var video_id = video_dict.id.videoId || my_video_id;

      // undo = unflag for adding
      if (dict.buffer_dict.hasOwnProperty(my_video_id)) {
        setButtonIcon(getElem(my_element, BUTTON), ADD);
        unsetOverlay(getVideo(dict.search_results, my_video_id), LISTED);
        unsetBufferDict(dict, my_video_id);
      } else {
        setButtonIcon(getElem(my_element, BUTTON), UNDO);
        setOverlay(getVideo(dict.search_results, my_video_id), LISTED);

        // stack for storing
        dict.buffer_dict[video_id] = {
          "id": video_id,
          "type": video_dict.id.kind,
          "original_title": video_dict.snippet.title,
          "original_artist": STR,
          "original_cover": video_dict.snippet.thumbnails.medium.url,
          "custom_title": STR,
          "custom_artist": STR,
          "custom_album": STR,
          "custom_cover": STR,
          "upvote_list": ARR,
          "downvote_list": ARR,
          "timestamp": new Date().getTime(),
          "pos": 0
        };
      }
      return;
    })

    .declareMethod("clearBuffer", function () {
      var gadget = this;
      var dict = gadget.property_dict;
      var buffer = dict.buffer_dict;
      var promise_list = [];
      var id;

      for (id in buffer) {
        if (buffer.hasOwnProperty(id)) {
          if (buffer[id]) {
            promise_list.push(gadget.frube_put(id, buffer[id]));
          } else {
            promise_list.push(gadget.frube_remove(id));
          }
        }
      }

      return new RSVP.Queue()
        .push(function () {
          return RSVP.all(promise_list);
        })
        .push(function (response_list) {
          dict.buffer_dict = {};
          if (response_list.length > 0 && gadget.state.flag_sync !== null) {
            return gadget.changeState({"flag_sync": response_list.length > 0});
          }
          return;
        });
    })

    .declareMethod("refreshPlaylist", function (my_delay) {
      var gadget = this;
      var dict = gadget.property_dict;
      var temp = gadget.template_dict;
      var query = getElem(gadget.element, FILTER_INPUT).value;

      dict.queue_list = [];

      return new RSVP.Queue()
        .push(function () {
          return RSVP.all([
            gadget.clearBuffer(),
            RSVP.delay(my_delay || 0)
          ]);
        })
        .push(function () {
          return gadget.frube_allDocs({"include_docs": true});
        })
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
          response.forEach(function (doc, pos) {
            var play = gadget.state.play;
            dict.queue_list.push(doc.id);
            if (oldest_timestamp > doc.timestamp) {
              oldest_timestamp = doc.timestamp;
            }
            html_content += QUEUE_TEMPLATE.supplant({
              "video_id": doc.id,
              "title": doc.title,
              "thumbnail_url": doc.custom_cover || doc.original_cover,
              "pos": doc.pos,
              "disable_first": pos === 0 ? DISABLED : STR,
              "disable_last": pos === len - 1 ? DISABLED : STR,
              "overlay": play === doc.id ? (OVERLAY + SPC + PLAYING) : STR
            });
          });
          setDom(gadget.property_dict.playlist, html_content, true);
          if (gadget.state.zero_stamp !== oldest_timestamp) {
            return gadget.changeState({"zero_stamp": oldest_timestamp});
          }
          return;
        });
    })

    .declareMethod("refreshSearchResults", function () {
      var gadget = this;
      var dict = gadget.property_dict;
      var catalog = dict.search_result_dict;
      var list = dict.queue_list;
      var response = STR;

      return new RSVP.Queue()
        .push(function () {
          return gadget.clearBuffer();
        })
        .push(function () {
          var item_id;
          var item;
          var video_id;
          var is_listed;

          for (item_id in catalog) {
            if (catalog.hasOwnProperty(item_id)) {
              item = catalog[item_id];
              video_id = item.id.videoId;
              is_listed = list.indexOf(video_id) > -1;
              response += SEARCH_TEMPLATE.supplant({
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
            setDom(dict.search_results, response, true);
          }
        });
    })

    .declareMethod("jumpVideo", function (my_jump) {
      var gadget = this;
      var element = gadget.element;
      var jump = getElem(element, SHUFFLE).checked ? null : my_jump;

      return new RSVP.Queue()
        .push(function () {
          return gadget.getVideoId(jump);
        })
        .push(function (my_id) {
          return gadget.changeState({"play": my_id});
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
      var dict = gadget.property_dict;

      return new RSVP.Queue()
        .push(function () {
          return gadget.getDeclaredGadget("dropbox");
        })
        .push(function (my_dropbox_gadget) {
          return my_dropbox_gadget.setDropboxConnect(dict.dropbox_id);
        })
        .push(function (my_oauth_dict) {
          var token = my_oauth_dict.access_token;
          var payload = new Blob([
            JSON.stringify({"token": token, "timestamp": getTimeStamp()})
          ], {type: "text/plain"});
          return RSVP.all([
            gadget.frube_create(getFrubeConfig(token)),
            gadget.changeState({"dropbox_connected": true}),
            gadget.token_putAttachment("/", "token", payload)
          ]);
        })
        .push(function () {
          setButtonIcon(dict.dropbox_button, "done");
          setButtonIcon(dict.sync_button, "sync");
          return RSVP.all([
            gadget.syncPlaylist(),
            gadget.changeState({"mode": WATCHING})
          ]);
        })
        .push(undefined, function (err) {
          throw err;
        });
    })

    .declareMethod("enterSearch", function () {
      var gadget = this;
      if (gadget.state.mode === SEARCHING) {
        return;
      }
      return gadget.changeState({"mode": SEARCHING});
    })

    .declareMethod("exitSearch", function () {
      var gadget = this;
      if (gadget.state.mode === WATCHING) {
        return;
      }
      return gadget.changeState({"mode": WATCHING});
    })

    .declareMethod("triggerSearchFromScroll", function () {
      var gadget = this;
      var state = gadget.state;
      var main = event.target;
      var main_pos = main.scrollTop;
      var height_trigger;
      var sec_trigger;

      if (state.mode === SEARCHING) {
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

    .declareMethod("updateFileInput", function (my_event) {
      var element = this.element;
      return new RSVP.Queue()
        .push(function () {
          return resizeFileToBase64(my_event.target.files[0]);
        })
        .push(function (blob) {
          getElem(element, ".frube-edit-custom-cover-image").src =
            getElem(element, ".frube-edit-custom-cover-input").value = blob;
          my_event.target.previousElementSibling.textContent = DELETE;
        });
    })

    .declareMethod("bufferInput", function (my_event, my_trigger) {
      var gadget = this;
      var target = my_event.target;
      var is_search = my_trigger === SEARCH;

      // empty filter clears all filters, let it pass
      if (target.value.length === 0 && is_search) {
        return gadget.exitSearch();
      }

      return new RSVP.Queue()
        .push(function () {
          var promise_list = [
            gadget.changeState({"last_key_stroke": getTimeStamp()}),
            RSVP.delay(gadget.state.search_buffer)
          ];
          if (is_search) {
            promise_list.push(gadget.enterSearch());
          }
          return RSVP.all(promise_list);
        })
        .push(function () {
          if (is_search) {
            return gadget.runSearch();
          }
          return gadget.refreshPlaylist();
        });
    })

    .declareMethod("runSearch", function (my_no_delay, my_next_page) {
      var gadget = this;
      var dict = gadget.property_dict;
      var state = gadget.state;
      var time = getTimeStamp();

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
          var search_input = getElem(gadget.element, SEARCH_INPUT);
          var token = STR;
          if (my_next_page && gadget.state.next_page_token) {
            token = gadget.state.next_page_token;
          }
          return gadget.tube_allDocs({
            "query": search_input.value,
            "token": token
          });
        })
        .push(function (response) {
          var item;
          var i;
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
          if (error.type === FORBIDDEN && error.detail === QUOTA) {
            dict.error_status.textContent = ERR_QUOTA;
            dict.error_status.classList.remove(HIDDEN);
            getElem(gadget.element, ".frube-dialog-configure").showModal();
            return;
          }

          // XXX throw?
          return gadget.changeState({"is_searching": false});
        });
    })

    /////////////////////////////
    // declared jobs
    /////////////////////////////
    .declareJob("waitForNetwork", function (my_video_id) {
      var gadget = this;

      return new RSVP.Queue()
        .push(function () {
          return RSVP.delay(TEN_MINUTES/40);
        })
        .push(function () {
          var status;
          if (window.navigator.onLine) {
            status = getElem(gadget.property_dict.search_results, "div");
            status.className = status.className.replace(OFFLINE, SEARCHING);
            return gadget.changeState({"play": my_video_id, "mode": WATCHING});
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
            gadget.refreshPlaylist(5000)
          ]);
        })
        .push(function () {
          sync_button.classList.remove(SPIN);
          sync_button.setAttribute(DISABLED, DISABLED);
        });
    })

    /////////////////////////////
    // declared service
    /////////////////////////////
    .declareService(function () {
      var gadget = this;
      var listener = window.loopEventListener;

      function isHash() {
        var video_id = getVideoHash();
        if (video_id) {
          return gadget.loadVideo(video_id);
        }
      }

      function isScroll(event) {
        return gadget.triggerSearchFromScroll(event);
      }

      return RSVP.all([
        listener(window, "hashchange", false, isHash),
        listener(gadget.property_dict.main, "scroll", false, isScroll)
      ]);
    })

    /////////////////////////////
    // on state change
    /////////////////////////////
    .onStateChange(function (modification_dict) {
      var gadget = this;
      var dict = gadget.property_dict;
      var queue;
      if (!gadget.state.play) {
        dict.video_controller.classList.add(HIDDEN);
      } else {
        dict.video_controller.classList.remove(HIDDEN);
      }
      if (modification_dict.hasOwnProperty("flag_sync")) {
        if (gadget.state.dropbox_connected) {
          dict.sync_button.removeAttribute(DISABLED);
        }
      }
      if (modification_dict.hasOwnProperty("play")) {
        queue = new RSVP.Queue();
        if (gadget.state.mode === WATCHING) {
          queue.push(gadget.exitSearch());
        } else {
          dict.video_controller.classList.remove(HIDDEN);
        }
        return queue
          .push(function () {
            var video_hash = getVideoHash();
            if (modification_dict.play === video_hash) {
              return gadget.loadVideo(video_hash);
            }
            window.location.hash = modification_dict.play;
            swapVideo(dict.playlist, video_hash);
            return;
          });
      }
      if (modification_dict.hasOwnProperty("mode")) {
        if (modification_dict.mode === SEARCHING) {
          setButtonIcon(getElem(dict.action_container, BUTTON), PLAY);
          dict.playlist_menu.classList.add(HIDDEN);
          dict.playlist.classList.add(HIDDEN);
          dict.player_container.classList.add(HIDDEN);
          dict.player_controller.classList.remove(HIDDEN);
          dict.search_results.classList.remove(HIDDEN);

          // clear search, else videos played will be shown as search results
          dict.search_result_dict = {};

          // refresh, else search input gets hung up
          if (!modification_dict.hasOwnProperty("last_key_stroke")) {
            return gadget.refreshSearchResults();
          }
        } else {
          setButtonIcon(getElem(dict.action_container, BUTTON), SEARCH);
          dict.playlist_menu.classList.remove(HIDDEN);
          dict.playlist.classList.remove(HIDDEN);
          dict.search_results.classList.add(HIDDEN);
          dict.player_controller.classList.add(HIDDEN);
          dict.player_container.classList.remove(HIDDEN);
          return gadget.refreshPlaylist();
        }
        dict.main.scrollTop = 0;
      }
      return;
    })

    /////////////////////////////
    // on Event
    /////////////////////////////

    // clickediclick, try to handle through forms, too
    .onEvent("click", function (event) {
      var target = event.target;
      var video_id = target.getAttribute(ID);
      var bad_indicator;
      var element;

      if (video_id) {
        return this.changeState({"play": video_id});
      }
      switch (target.getAttribute(NAME)) {
        case "frube-connector-dropbox":
          return this.connectAndSyncWithDropbox();
        case "frube-view-switch":
          return this.changeState({
            "mode": this.state.mode === SEARCHING ? WATCHING : SEARCHING
          });
        case "frube-upload":
          bad_indicator = target.previousElementSibling;
          element = this.element;
          if (bad_indicator.textContent === DELETE) {
            bad_indicator.textContent = ATTACH;
            getElem(element, ".frube-edit-custom-cover-image").src = PLACEHOLDER;
            getElem(element, ".frube-edit-custom-cover-input").value = STR;
            event.preventDefault();
            return false;
          }
      }
    }, false, false)

    .onEvent("change", function (event) {
      var target = event.target;
      if (target.classList.contains(SLIDER)) {
        this.property_dict.player.seekTo(target.value, true);
        return;
      }
      if (target.classList.contains(UPLOAD)) {
        return this.updateFileInput(event);
      }
    }, false, false)

    .onEvent("mouseDown", function (event) {
      if (event.target.id === IS_SLIDER) {
        return this.changeState({"slider_in_use": true});
      }
    }, false, false)

    .onEvent("mouseUp", function (event) {
      if (event.target.id === IS_SLIDER) {
        return this.changeState({"slider_in_use": false});
      }
    }, false, false)

    .onEvent("input", function (event) {
      switch (event.target.getAttribute("name")) {
        case "frube-search-input":
          return this.bufferInput(event, SEARCH);
        case "frube-filter-input":
          return this.bufferInput(event, FILTER);
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
          return this.changeState({"play": getAttr(event, ID)});
        case "frube-playlist-next":
          return this.jumpVideo(1);
        case "frube-playlist-previous":
          return this.jumpVideo(-1);
        case "frube-filter-source":
          return this.refreshPlaylist();
        case "frube-search-source":
          return this.runSearch(true);
        case "frube-trending-up":
          return this.rateVideo(getAttr(event, ID), 1);
        case "frube-trending-down":
          return this.rateVideo(getAttr(event, ID), -1);
        case "frube-sync":
          return this.syncPlaylist();
        case "frube-dialog":
          return this.handleDialog(event);
        case "frube-playlist-undo":
          delete this.property_dict.buffer_dict[getAttr(event, ID)];
          break;
        case "frube-play-pause":
          playOrPause(this.property_dict.player);
          break;
        case "frube-set-volume":
          setVolume(this.property_dict.player, event);
          break;
        case "frube-home":
          this.property_dict.main.scrollTop = 0;
          break;
      }
    }, false, true);

}(window, rJS, RSVP, YT, JSON, Blob, FormData, URL, Math));

