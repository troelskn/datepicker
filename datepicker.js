/**
  * A cross-browser datepicker widget.
  *
  * Works with: Mochikit or Prototype.js
  *
  * Copyright (c) 2004,2005,2006,2009 Troels Knak-Nielsen
  *
  * License: public domain
  *
  * Version : 22. jul 2009
  */

if (typeof(minikit) == "undefined") {
  minikit = {};
}

if (typeof(window.Prototype) != "undefined") {
  // prototype bindings
  minikit.$ = $;
  minikit.callLater = function(func, seconds) {
    window.setTimeout(func, 1000 * seconds);
  };
  minikit.createDOM = function(name, parameters) {
    return new Element(name, parameters);
  };
  minikit.bind = function(fn, obj) {
    return fn.bind(obj);
  };
  minikit.event = {};
  minikit.event.connect = function(element, eventName, handler) {
    eventName = eventName.replace(/^on/, "");
    Event.observe(element, eventName, handler);
    return [element, eventName, handler];
  };
  minikit.event.disconnect = function(signal) {
    Event.stopObserving(signal[0], signal[1], signal[2]);
  };
  minikit.event.keyCode = function(e) {
    return e.which || e.keyCode;
  };
  minikit.event.stop = function(e) {
    Event.stop(e);
  };
  minikit.event.signal = function(element, eventName) {
    eventName = eventName.replace(/^on/, "");
    if (document.createEvent) {
      var event = document.createEvent('HTMLEvents');
      event.initEvent(eventName, true, true);
      element.dispatchEvent(event);
    } else {
      element.fireEvent('on' + eventName, document.createEventObject());
    }
  };
} else if (typeof(window.MochiKit) != "undefined") {
  // MochiKit bindings
  minikit.$ = MochiKit.DOM.getElement;
  minikit.callLater = MochiKit.Async.callLater;
  minikit.createDOM = MochiKit.DOM.createDOM;
  minikit.bind = MochiKit.Base.bind;
  minikit.event = {};
  minikit.event.connect = MochiKit.Signal.connect;
  minikit.event.disconnect = MochiKit.Signal.disconnect;
  minikit.event.keyCode = function(e) {
    return e.key().code;
  };
  minikit.event.stop = function() {
    e.stop();
  };
  minikit.event.signal = MochiKit.Signal.signal;
}

/*
  global exports. this is the public html-hackers interface.
*/
var __EXPORT__ = function(self) {
  /** el, args [, options] */
  self.datePicker = minikit.datePicker;
}

minikit.datePicker = function(el, args, options) {
  var f = function() {
    var widget = new minikit.DatePicker(args);
    widget.attach(minikit.$(el));
  }
  if (options && options.delay) {
    minikit.callLater(1, f);
  } else {
    f();
  }
}

/**
  * A cross-browser datepicker widget.
  *
  * Copyright (c) 2004,2005,2006,2009 Troels Knak-Nielsen
  *
  * License: public domain
  *
  * Version : 22. jul 2009
  */
minikit.DatePicker = function(args) {
  this.view = {};
  this._signalCache = [];

  this.i18n = {};
  this.i18n.nullValue = "Not supplied";
  this.i18n.months = [
    "January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"
  ];

  if (args) {
    this.mode = (args.mode) ? args.mode : minikit.DatePicker.MODE_DATE;
    if (args.nullable) {
      this.nullable = true;
    }
    if (args.i18n) {
      for (var key in args.i18n) {
        this.i18n[key] = args.i18n[key];
      }
    }
  }

  // default values to start out with
  this.setValue(new Date());
  this.startYear = this.date.getRealYear() - 10;
  this.endYear = this.date.getRealYear() + 10;
}

minikit.DatePicker.MODE_DATE = 1;
minikit.DatePicker.MODE_DATE_TIME = 2;
minikit.DatePicker.MODE_DATE_TIME_SECONDS = 3;

minikit.DatePicker.extendDate = function(obj) {
  if (obj._extendedDate) return obj;
  obj.getRealYear = function() {
    if (this.getFullYear) {
      return parseInt(this.getFullYear());
    } else {
      var y = parseInt(this.getYear());
      if (y < 100) return y + 1900;
    }
    return y;
  };
  obj.setFromString = function(s) {
    var patternShort = new RegExp("^([0-9]{4})-([0-9]{2})-([0-9]{2})$");
    var patternFull = new RegExp("^([0-9]{4})-([0-9]{2})-([0-9]{2}) ([0-9]{2}):([0-9]{2}):([0-9]{2})$");
    if (s.match(patternShort)) {
      pattern = patternShort;
    } else if (s.match(patternFull)) {
      pattern = patternFull;
    } else {
      throw new Error("Input string must be ISO 8601 formated date");
    }
    var matches = pattern.exec(s);
    if (this.setFullYear) {
      this.setFullYear(matches[1]);
    } else {
      this.setYear(matches[1]);
    }
    this.setDate(1);
    this.setMonth(matches[2] - 1);
    this.setDate(matches[3]);
    if (matches.length > 4) {
      this.setHours(matches[4]);
      this.setMinutes(matches[5]);
      this.setSeconds(matches[6]);
    }
  }
  obj._extendedDate = true;
  return obj;
}

minikit.DatePicker.prototype.setValue = function(d) {
  if (d == null) {
    this.setValue(new Date());
    this.date = null;
    return;
  }
  if (d instanceof Date) {
    if (!d._extendedDate) {
      this.date = minikit.DatePicker.extendDate(d);
    } else {
      this.date = d;
    }
  } else {
    this.date = minikit.DatePicker.extendDate(new Date());
    this.date.setFromString(d);
  }
  if (this.date.getRealYear() < this.startYear) this.startYear = this.date.getRealYear();
  if (this.date.getRealYear() > this.endYear) this.endYear = this.date.getRealYear();
}

/**
  * Returns an ISO formatted datetime-string
  */
minikit.DatePicker.prototype.getValue = function() {
  if (this.date == null) {
    return "";
  }
  var intToString = function(n) {
    if (n  < 10) return "0" + n;
    else return "" + n;
  };
  var str = this.date.getRealYear() + "-" + intToString(this.date.getMonth()+1) + "-" + intToString(this.date.getDate());
  if (this.mode == minikit.DatePicker.MODE_DATE_TIME) {
    str += " " + intToString(this.date.getHours()) + ":" + intToString(this.date.getMinutes()) + ":00";
  } else   if (this.mode == minikit.DatePicker.MODE_DATE_TIME_SECONDS) {
    str += " " + intToString(this.date.getHours()) + ":" + intToString(this.date.getMinutes()) + ":" + intToString(this.date.getSeconds());
  }
  return str;
}

minikit.DatePicker.prototype.attach = function(elm) {
  this.view = {};

  this.view.field = elm;
  if (elm.type.toLowerCase() != "hidden") {
    elm.style.display = "none";
  }
  var useDate;
  if (this.nullable && this.view.field.value == "") {
    this.setValue(new Date());
    useDate = this.date;
    this.date = null;
  } else {
    this.setValue(this.view.field.value);
    useDate = this.date;
  }

  var extendSelect = function(obj) {
    obj._removeItem = function(value) {
      var len = this.length;
      for (var i=0; i<len ; i++) {
        if (this.options[i] != null) {
          if (this.options[i].value == value) {
            this.options[i] = null;
            return true;
          }
        }
      }
      return false;
    }

    obj._addItem = function(value, key) {
      this._removeItem(value);
      if (!key) key = value;
      this.options[this.length] = new Option(key, value);
    }

    obj._selectItem = function(value) {
      var len = this.length;
      for (var i=0; i<len ; i++) {
        if (this.options[i].value == value) {
          this.options[i].selected = true;
          return true;
        }
      }
      return false;
    }

    obj._getSelectedValue = function() {
      return this.options[this.selectedIndex].value;
    }
    return obj;
  }

  var container = minikit.createDOM("DIV");
  container.className = "minikit-datepicker";
  this.view.container = container;
  this.view.field.parentNode.insertBefore(container, this.view.field);

  this.view.inputs = {};
  this.view.inputs.day = extendSelect(minikit.createDOM("SELECT"));
  for (var i=1; i <= 31; i++) {
    var option = minikit.createDOM("OPTION");
    option.setAttribute("value", i);
    option.appendChild(document.createTextNode(i));
    this.view.inputs.day.appendChild(option);
  }
  this.view.container.appendChild(this.view.inputs.day);
  this.connect(this.view.inputs.day, "onchange", minikit.bind(this.viewChanged, this));
  this.view.inputs.day._selectItem(useDate.getDate());

  this.view.container.appendChild(document.createTextNode(" "));

  this.view.inputs.month = extendSelect(minikit.createDOM("SELECT"));
  for (var i=1; i <= 12; i++) {
    var option = minikit.createDOM("OPTION");
    option.setAttribute("value", i);
    option.appendChild(document.createTextNode(this.i18n.months[i-1]));
    this.view.inputs.month.appendChild(option);
  }
  this.view.container.appendChild(this.view.inputs.month);
  this.connect(this.view.inputs.month, "onchange", minikit.bind(this.viewChanged, this));
  this.view.inputs.month._selectItem(useDate.getMonth()+1);

  this.view.container.appendChild(document.createTextNode(" "));

  this.view.inputs.year = extendSelect(minikit.createDOM("SELECT"));
  for (var i = this.startYear; i <= this.endYear; i++) {
    var option = minikit.createDOM("OPTION");
    option.setAttribute("value", i);
    option.appendChild(document.createTextNode(i));
    this.view.inputs.year.appendChild(option);
  }
  this.view.container.appendChild(this.view.inputs.year);
  this.connect(this.view.inputs.year, "onchange", minikit.bind(this.viewChanged, this));
  this.view.inputs.year._selectItem(useDate.getRealYear());

  if (this.mode == minikit.DatePicker.MODE_DATE_TIME || this.mode == minikit.DatePicker.MODE_DATE_TIME_SECONDS) {
    var keyDownHandler = function(event) {
      var flag = false;
      var code = minikit.event.keyCode(event);
      if (code == 40) {
        this.value = parseInt(parseFloat(this.value)) - 1;
        minikit.event.signal(this, "onchange");
        flag = true;
      }
      if (code == 38) {
        this.value = parseInt(parseFloat(this.value)) + 1;
        minikit.event.signal(this, "onchange");
        flag = true;
      }
      if (code == 34) {
        this.value = parseInt(parseFloat(this.value)) - 10;
        minikit.event.signal(this, "onchange");
        flag = true;
      }
      if (code == 33) {
        this.value = parseInt(parseFloat(this.value)) + 10;
        minikit.event.signal(this, "onchange");
        flag = true;
      }

      if (flag) {
        try {
          if (document.selection && document.selection.createRange) { // ie
            var txtrange = this.createTextRange();
            txtrange.moveStart("character", 0);
            txtrange.select();
          } else {
            this.selectionStart = 0;
            this.selectionEnd = this.value.length;
          }
        } catch (ex) {}
        minikit.event.stop(event);
      }
    }

    this.view.container.appendChild(document.createTextNode(" "));
    this.view.inputs.hour = minikit.createDOM("INPUT", {type: "text", size: 2, maxlength: 2});
    this.view.inputs.hour.style.width = "2em";
    this.view.container.appendChild(this.view.inputs.hour);
    this.connect(this.view.inputs.hour, "onchange", minikit.bind(this.viewChanged, this));
    this.connect(this.view.inputs.hour, "onkeydown", minikit.bind(keyDownHandler, this.view.inputs.hour));
    this.view.inputs.hour.value = useDate.getHours();

    this.view.container.appendChild(document.createTextNode(" "));
    this.view.inputs.minute = minikit.createDOM("INPUT", {type: "text", size: 2, maxlength: 2});
    this.view.inputs.minute.style.width = "2em";
    this.view.container.appendChild(this.view.inputs.minute);
    this.connect(this.view.inputs.minute, "onchange", minikit.bind(this.viewChanged, this));
    this.connect(this.view.inputs.minute, "onkeydown", minikit.bind(keyDownHandler, this.view.inputs.minute));
    this.view.inputs.minute.value = useDate.getMinutes();

    if (this.mode == minikit.DatePicker.MODE_DATE_TIME) {
      this.view.inputs.second = minikit.createDOM("INPUT", {type: "hidden"});
      this.view.container.appendChild(this.view.inputs.second);
    } else {
      this.view.container.appendChild(document.createTextNode(" "));
      this.view.inputs.second = minikit.createDOM("INPUT", {type: "text", size: 2, maxlength: 2});
      this.view.inputs.second.style.width = "2em";
      this.view.container.appendChild(this.view.inputs.second);
      this.connect(this.view.inputs.second, "onkeydown", minikit.bind(keyDownHandler, this.view.inputs.second));
    }
    this.connect(this.view.inputs.second, "onchange", minikit.bind(this.viewChanged, this));
    this.view.inputs.second.value = useDate.getSeconds();
  }
  if (this.nullable) {
    this.view.inputs.isnull = minikit.createDOM("INPUT", {type: "checkbox", id: this.view.field.id + "-null", "class": "minikit-datepicker-isnull"});
    if (this.date == null) {
      this.view.inputs.isnull.setAttribute("checked", true);
      this.view.inputs.isnull.checked = true;
      this.view.inputs.isnull.defaultChecked = true;
    }
    this.view.label = minikit.createDOM("LABEL", {"for": this.view.field.id + "-null"});
    this.view.label.className = "minikit-datepicker-label";
    this.connect(this.view.inputs.isnull, "onchange", minikit.bind(this.onNullChange, this));
    var doBlur = minikit.bind(function() { this.blur(); }, this.view.inputs.isnull);
    this.connect(this.view.inputs.isnull, "onclick", doBlur);
    this.connect(this.view.label, "onclick", doBlur);
    this.view.label.appendChild(document.createTextNode(this.i18n.nullValue));
    this.view.container.appendChild(this.view.inputs.isnull);
    this.view.container.appendChild(this.view.label);
  }

  this.viewChanged();
  return this.view.container;
}

/**
  * Remove the widget from the DOM.
  */
minikit.DatePicker.prototype.detach = function() {
  for (var i = 0, l = this._signalCache.length; i < l; ++i) {
    try {
      minikit.event.disconnect(this._signalCache[i]);
    } catch (ex) { /* squelch */ }
  }
  delete(this._signalCache);
}

/**
  * Attaches an event. Use this method to ensure cleanup through detach
  */
minikit.DatePicker.prototype.connect = function(src, sig, slot) {
  this._signalCache.push(minikit.event.connect(src, sig, slot));
}

minikit.DatePicker.prototype.onNullChange = function() {
  if (!this.view.inputs.isnull.checked) {
    this.setValue(new Date());
    this.viewChanged();
  } else {
    this.setValue(null);
    this.view.field.value = this.getValue();
    this.viewChanged();
  }
}

minikit.DatePicker.prototype.viewChanged = function() {
  if (this.date == null) {
    this.view.inputs.day.disabled = true;
    this.view.inputs.month.disabled = true;
    this.view.inputs.year.disabled = true;
    if (this.view.inputs.hour) {
      this.view.inputs.hour.disabled = true;
      this.view.inputs.minute.disabled = true;
      this.view.inputs.second.disabled = true;
    }
    return;
  }
  this.view.inputs.day.disabled = false;
  this.view.inputs.month.disabled = false;
  this.view.inputs.year.disabled = false;
  if (this.view.inputs.hour) {
    this.view.inputs.hour.disabled = false;
    this.view.inputs.minute.disabled = false;
    this.view.inputs.second.disabled = false;
  }

  var day = this.view.inputs.day._getSelectedValue();
  var month = this.view.inputs.month._getSelectedValue();
  var year = this.view.inputs.year._getSelectedValue();

  this.view.inputs.day._addItem(29);
  this.view.inputs.day._addItem(30);
  this.view.inputs.day._addItem(31);

  // short month
  if (month == 4 || month == 6 || month == 9 || month == 11) {
    this.view.inputs.day._removeItem(31);
  }
  // february
  if (month == 2) {
    this.view.inputs.day._removeItem(31);
    this.view.inputs.day._removeItem(30);
  }
  // leap year
  var isLeap = (year % 4) == 0;
  if (month == 2 && !isLeap) {
    this.view.inputs.day._removeItem(29);
  }

  this.view.inputs.day._selectItem(day);

  this.date.setDate(day);
  this.date.setMonth(month - 1);
  if (this.date.setFullYear) {
    this.date.setFullYear(year);
  } else {
    this.date.setYear(year);
  }

  if (this.mode == minikit.DatePicker.MODE_DATE_TIME || this.mode == minikit.DatePicker.MODE_DATE_TIME_SECONDS) {
    var num = parseInt(parseFloat(this.view.inputs.hour.value));
    if (isNaN(num)) num = 0;
    if (num > 23) num = 0;
    if (num < 0) num = 23;
    if (num < 10) num = "0" + num;
    this.view.inputs.hour.value = num;
    this.date.setHours(num);

    num = parseInt(parseFloat(this.view.inputs.minute.value));
    if (isNaN(num)) num = 0;
    if (num > 59) num = 0;
    if (num < 0) num = 59;
    if (num < 10) num ="0" + num;
    this.view.inputs.minute.value = num;
    this.date.setMinutes(num);

    num = parseInt(parseFloat(this.view.inputs.second.value));
    if (isNaN(num)) num = 0;
    if (num > 59) num = 0;
    if (num < 0) num = 59;
    if (num < 10) num ="0" + num;
    this.view.inputs.second.value = num;
    this.date.setSeconds(num);
  }
  this.view.field.value = this.getValue();
}

minikit.DatePicker.prototype.detach = function() {
  this.supertype.detach.apply(this, arguments);
  this.view.container.parentNode.removeChild(this.view.container);
  if (this.view.field.type.toLowerCase() != "hidden") {
    this.view.field.style.display = "";
  }
}

__EXPORT__(window);
