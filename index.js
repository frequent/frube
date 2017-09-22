/*jslint maxlen: 80, indent: 2 */
/*global window, rJS, RSVP */
(function (window, rJS, RSVP) {
  "use strict";

  /////////////////////////////
  // parameters
  /////////////////////////////
  var OPTION_DICT = {
    "youtube_id": "AIzaSyD_ZX5na0fPbcLbO5sZ2hWD-FxR-Xd2_TM",
    "dropbox_id": "rz2ua0dyty5lxx7"
  };

  rJS(window)

    /////////////////////////////
    // published methods
    /////////////////////////////

    // bridge to frube JIO
    .allowPublicAcquisition('frube_create', function (my_option_dict) {
      return this.getDeclaredGadget("frube_jio")
        .push(function (my_gadget) {
          return my_gadget.createJIO.apply(my_gadget, my_option_dict);
        });
    })
    .allowPublicAcquisition("frube_allDocs", function (my_param_list) {
      return this.getDeclaredGadget("frube_jio")
        .push(function (my_gadget) {
          return my_gadget.allDocs.apply(my_gadget, my_param_list);
        });
    })
    .allowPublicAcquisition("frube_remove", function (my_param_list) {
      return this.getDeclaredGadget("frube_jio")
        .push(function (my_gadget) {
          return my_gadget.remove.apply(my_gadget, my_param_list);
        });
    })
    .allowPublicAcquisition("frube_post", function (my_param_list) {
      return this.getDeclaredGadget("frube_jio")
        .push(function (my_gadget) {
          return my_gadget.post.apply(my_gadget, my_param_list);
        });
    })
    .allowPublicAcquisition("frube_put", function (my_param_list) {
      return this.getDeclaredGadget("frube_jio")
        .push(function (my_gadget) {
          return my_gadget.put.apply(my_gadget, my_param_list);
        });
    })
    .allowPublicAcquisition("frube_get", function (my_param_list) {
      return this.getDeclaredGadget("frube_jio")
        .push(function (my_gadget) {
          return my_gadget.get.apply(my_gadget, my_param_list);
        });
    })
    .allowPublicAcquisition("frube_allAttachments", function (my_param_list) {
      return this.getDeclaredGadget("frube_jio")
        .push(function (my_gadget) {
          return my_gadget.allAttachments.apply(my_gadget, my_param_list);
        });
    })
    .allowPublicAcquisition("frube_getAttachment", function (my_param_list) {
      return this.getDeclaredGadget("frube_jio")
        .push(function (my_gadget) {
          return my_gadget.getAttachment.apply(my_gadget, my_param_list);
        });
    })
    .allowPublicAcquisition("frube_putAttachment", function (my_param_list) {
      return this.getDeclaredGadget("frube_jio")
        .push(function (my_gadget) {
          return my_gadget.putAttachment.apply(my_gadget, my_param_list);
        });
    })
    .allowPublicAcquisition("frube_removeAttachment", function (my_param_list) {
      return this.getDeclaredGadget("frube_jio")
        .push(function (my_gadget) {
          return my_gadget.removeAttachment.apply(my_gadget, my_param_list);
        });
    })
    .allowPublicAcquisition("frube_repair", function (my_param_list) {
      return this.getDeclaredGadget("frube_jio")
        .push(function (my_gadget) {
          return my_gadget.repair.apply(my_gadget, my_param_list);
        });
    })

    // briget to (you)tube JIO
    .allowPublicAcquisition('tube_create', function (my_option_dict) {
      return this.getDeclaredGadget("tube_jio")
        .push(function (my_gadget) {
          return my_gadget.createJIO.apply(my_gadget, my_option_dict);
        });
    })
    .allowPublicAcquisition('tube_allDocs', function (my_option_dict) {
      return this.getDeclaredGadget("tube_jio")
        .push(function (my_gadget) {
          return my_gadget.allDocs.apply(my_gadget, my_option_dict);
        });
    })
    .allowPublicAcquisition('tube_get', function (my_id) {
      return this.getDeclaredGadget("tube_jio")
        .push(function (my_gadget) {
          return my_gadget.get.apply(my_gadget, my_id);
        });
    })

    // briget to token JIO
    .allowPublicAcquisition('token_create', function (my_option_dict) {
      return this.getDeclaredGadget("token_jio")
        .push(function (my_gadget) {
          return my_gadget.createJIO.apply(my_gadget, my_option_dict);
        });
    })
    .allowPublicAcquisition('token_putAttachment', function (my_option_dict) {
      return this.getDeclaredGadget("token_jio")
        .push(function (my_gadget) {
          return my_gadget.putAttachment.apply(my_gadget, my_option_dict);
        });
    })
    .allowPublicAcquisition('token_getAttachment', function (my_id) {
      return this.getDeclaredGadget("token_jio")
        .push(function (my_gadget) {
          return my_gadget.getAttachment.apply(my_gadget, my_id);
        });
    })
    .allowPublicAcquisition('token_removeAttachment', function (my_id) {
      return this.getDeclaredGadget("token_jio")
        .push(function (my_gadget) {
          return my_gadget.removeAttachment.apply(my_gadget, my_id);
        });
    })
    
    /////////////////////////////
    // declared service
    /////////////////////////////
    .declareService(function () {
      var gadget = this;
      return gadget.getDeclaredGadget("frube")
        .push(function (my_frube_gadget) {
          return my_frube_gadget.render(OPTION_DICT);
        })
        .push(null, function (my_error) {
          console.log(my_error);
          throw my_error;
        });
    });

}(window, rJS, RSVP));
