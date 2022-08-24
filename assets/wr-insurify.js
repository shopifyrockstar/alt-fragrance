"use strict";
if (typeof insuirfyWidget === "undefined") {
  var insuirfyWidget = {
    shop: Shopify.shop,
    widgetRenderSelector: "insurify-widget-container",
    ajaxCartCallback: null,
  };
} else {
  insuirfyWidget.shop =
    typeof insuirfyWidget.shop === "undefined"
      ? Shopify.shop
      : insuirfyWidget.shop;
  insuirfyWidget.widgetRenderSelector =
    typeof insuirfyWidget.widgetRenderSelector === "undefined"
      ? "insurify-widget-container"
      : insuirfyWidget.widgetRenderSelector;
  insuirfyWidget.ajaxCartCallback =
    typeof insuirfyWidget.ajaxCartCallback === "undefined"
      ? null
      : insuirfyWidget.ajaxCartCallback;
}
(function () {
  const insurifyProxy = "/a/insurify/";
  const insurifyController = insurifyProxy + "wr-insurify";
  const insurifyCssUri =
    "https://wr-shopify-app-assets.s3.amazonaws.com/public-app/insurify-v1.1/css/";
  const insurifyAssestUri =
    "https://wr-shopify-app-assets.s3.amazonaws.com/public-app/insurify-v1.1/image/";
  const requestHttpHeaders = {
    "Content-Type": "application/json;charset=utf-8",
  };
  class InsurifyObj {
    constructor(shopifyUri) {
      this.filesadded = "";
      this.currentReqRoute = null;
      this.currentReqMethod = null;
      this.currentReqParams = null;
      this.shop;
      this.widgetConfig;
      this.InsurifySettings;
      this.filesadded = "";
      this.currentInsurifyCart = {};
      this.isInitLoaded = 0;
      this.widgetElem;
      this.existingProtectionNodePrice = 0;
      this.currentProtectionNodePrice = 0;
      this.existingProtectionNodeVariant = "";
      this.currentProtectionNodeVariant = "";
      this.existingProtectionNodeVariantQty = 0;
      // set myshopify url
      this.shop = shopifyUri;
      // widget config
      this.widgetConfig = insuirfyWidget;
      // helper functions
      this.cleanHtmlNode();
      // get current cart
      this.getInsurifyStoreCart();
      // get insurify settings
      this.getInsurifySettings();
      // catch XHR events
      this.ajaxRequestHook();
      // catch Fetch events
      this.fetchRequestHook();
      window.insuirfyWidget.methods = window.insuirfyWidget.methods || {};
      window.insuirfyWidget.methods = {
        initInsurifyWidget: this.reRenderInsurifyWidget.bind(this),
      };
    }
    reRenderInsurifyWidget() {
      // get insurify settings
      this.isInitLoaded = 0;
      this.renderInsurifyWidget();
    }
    set generalSettings(settings) {
      this.InsurifySettings = settings;
    }
    async cartAjaxCallBackFn(cart) {
      if (
        typeof insuirfyWidget.ajaxCartCallback === "function" &&
        insuirfyWidget.ajaxCartCallback instanceof Function &&
        cart &&
        cart instanceof Object
      ) {
        await insuirfyWidget.ajaxCartCallback(cart);
      }
    }
    __setCookie(cname, cvalue, exdays) {
      var d = new Date();
      d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
      var expires = "expires=" + d.toUTCString();
      document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
    }
    __getCookie(cname) {
      var name = cname + "=";
      var ca = document.cookie.split(";");
      for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == " ") {
          c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
          return c.substring(name.length, c.length);
        }
      }
      return "";
    }
    convertUriParamsToJson(uriParams) {
      return JSON.parse(
        '{"' +
          decodeURI(uriParams.replace(/&/g, '","').replace(/=/g, '":"')) +
          '"}'
      );
    }
    loadjscssfile(fileName, fileType) {
      if (fileType == "js") {
        //if filename is a external JavaScript file
        var fileref = document.createElement("script");
        fileref.setAttribute("type", "text/javascript");
        fileref.setAttribute(
          "src",
          insurifyCssUri + fileName + "?v=" + Date.now()
        );
      } else if (fileType == "css") {
        //if filename is an external CSS file
        var fileref = document.createElement("link");
        fileref.setAttribute("rel", "stylesheet");
        fileref.setAttribute("type", "text/css");
        fileref.setAttribute(
          "href",
          insurifyCssUri + fileName + "?v=" + Date.now()
        );
      } else if (fileType == "jsurl") {
        //if filename is a js url
        var fileref = document.createElement("script");
        fileref.setAttribute("src", fileName + "?v=" + Date.now());
      } else if (fileType == "cssurl") {
        //if filename is a CSS url
        var fileref = document.createElement("link");
        fileref.setAttribute("rel", "stylesheet");
        fileref.setAttribute("href", fileName + "?v=" + Date.now());
      }
      if (typeof fileref != "undefined") {
        document.getElementsByTagName("head")[0].appendChild(fileref);
      }
    }
    checkloadjscssfile(fileName, fileType) {
      if (this.filesadded.indexOf("[" + fileName + "]") == -1) {
        this.loadjscssfile(fileName, fileType);
        this.filesadded += "[" + fileName + "]"; //List of files added in the form "[filename1],[filename2],etc"
      } else return false;
    }
    ajaxRequestHook() {
      let InsurifyObj = this;
      let s_ajaxListener = new Object();
      // Added for IE support
      if (typeof XMLHttpRequest === "undefined") {
        XMLHttpRequest = function () {
          try {
            return new ActiveXObject("Msxml2.XMLHTTP.6.0");
          } catch (e) {}
          try {
            return new ActiveXObject("Msxml2.XMLHTTP.3.0");
          } catch (e) {}
          try {
            return new ActiveXObject("Microsoft.XMLHTTP");
          } catch (e) {}
          throw new Error("This browser does not support XMLHttpRequest.");
        };
      }
      s_ajaxListener.tempOpen = XMLHttpRequest.prototype.open;
      s_ajaxListener.tempSend = XMLHttpRequest.prototype.send;
      s_ajaxListener.callback = function () {
        // this.method :the ajax method used
        // this.url    :the url of the requested script (including query string, if any) (urlencoded)
        // this.data   :the data sent, if any ex: foo=bar&a=b (urlencoded)
        if (InsurifyObj.checkforValidCartAjaxAPIRoute(this.url) === true) {
          // console.log('xhr:entry');
          InsurifyObj.getInsurifyStoreCart();
        }
        if (
          InsurifyObj.checkforValidCartAjaxAPIRoute(this.url) === true &&
          this.method.toLowerCase() === "post"
        ) {
          InsurifyObj.currentReqRoute = this.url;
          InsurifyObj.currentReqMethod = this.method;
          InsurifyObj.currentReqParams = {};
          if (this.data instanceof FormData) {
            for (var pair of this.data.entries()) {
              InsurifyObj.currentReqParams[pair[0]] = pair[1];
            }
          } else {
            try {
              InsurifyObj.currentReqParams = JSON.parse(this.data);
            } catch (error) {
              InsurifyObj.currentReqParams = InsurifyObj.convertUriParamsToJson(
                this.data
              );
            }
          }
          if (
            Object.keys(InsurifyObj.currentReqParams).length === 1 ||
            Object.keys(InsurifyObj.currentReqParams).length === 2
          ) {
            let getUpdatesSlugs = [];
            getUpdatesSlugs = Object.keys(InsurifyObj.currentReqParams).filter(
              (paramKey) => {
                return (
                  paramKey.toLowerCase() != "attributes" &&
                  paramKey.indexOf("updates[") > -1
                );
              }
            );
            if (getUpdatesSlugs.length > 0) {
              getUpdatesSlugs.map((keyslug, index) => {
                let slugQty = parseInt(InsurifyObj.currentReqParams[keyslug]);
                let slug = keyslug.replace("updates[", "");
                slug = slug.replace("]", "");
                let lookForProtectionNode = {};
                lookForProtectionNode = InsurifyObj.InsurifySettings.insurifyProduct.filter(
                  (node) => {
                    return slug.toString() === node.id.toString();
                  }
                )[0];
                if (typeof lookForProtectionNode === "undefined") {
                  lookForProtectionNode = {};
                }
                if (Object.keys(lookForProtectionNode).length > 0) {
                  if (slugQty === 0) {
                    InsurifyObj.InsurifySettings.isSwatchDefaultSelected = 0;
                  }
                }
              });
            }
          }
          if (typeof InsurifyObj.currentReqParams.attributes === "undefined") {
            InsurifyObj.currentReqParams.attributes = {};
          }
          if (
            typeof InsurifyObj.currentReqParams.attributes["insurifyUpdate"] ===
              "undefined" ||
            typeof InsurifyObj.currentReqParams.attributes["insurifyUpdate"] ===
              "string"
          ) {
            setTimeout(() => {
              InsurifyObj.cartHookRender();
            }, 500);
          }
        }
      };
      XMLHttpRequest.prototype.open = function (a, b) {
        if (!a) var a = "";
        if (!b) var b = "";
        s_ajaxListener.tempOpen.apply(this, arguments);
        s_ajaxListener.method = a;
        s_ajaxListener.url = b;
        if (a.toLowerCase() == "get") {
          s_ajaxListener.data = b.split("?");
          s_ajaxListener.data = s_ajaxListener.data[1];
        }
      };
      XMLHttpRequest.prototype.send = function (a, b) {
        if (!a) var a = "";
        if (!b) var b = "";
        s_ajaxListener.tempSend.apply(this, arguments);
        if (s_ajaxListener.method.toLowerCase() == "post")
          s_ajaxListener.data = a;
        s_ajaxListener.callback();
      };
    }
    checkforValidCartAjaxAPIRoute(path) {
      var route = "/cart/:uid.js";
      var route2 = "/cart/:uid";
      var routeMatcher = new RegExp(route.replace(/:[^\s/]+/g, "([\\w-]+)"));
      var routeMatcher2 = new RegExp(route2.replace(/:[^\s/]+/g, "([\\w-]+)"));
      let m;
      m =
        path.match(routeMatcher) !== null
          ? path.match(routeMatcher)
          : path.match(routeMatcher2) !== null
          ? path.match(routeMatcher2)
          : null;
      if (m !== null) {
        if (m.indexOf("/cart.js") === -1) {
          return true;
        }
      } else {
        return false;
      }
    }
    fetchRequestHook() {
      let InsurifyObj = this;
      const originalFetch = fetch;
      fetch = async (input, init) => {
        //debugger; // do what ever you want with request or reject it immediately
        InsurifyObj.currentReqRoute = input;
        InsurifyObj.currentReqMethod = init
          ? init.method
            ? init.method
            : ""
          : "";
        InsurifyObj.currentReqParams = {};
        if (
          InsurifyObj.checkforValidCartAjaxAPIRoute(input) === true &&
          init.method
        ) {
          if (init.method.toLowerCase() === "post") {
            // console.log('fetch:entry');
            let _skipHeaderCheck = false;
            if (init.headers["X-Requested-With"]) {
              _skipHeaderCheck =
                init.headers["X-Requested-With"] === "XMLHttpRequest";
            }
            if (!_skipHeaderCheck) {
              if (init.headers) {
                if (
                  init.headers["Content-Type"].toLowerCase() ===
                    "application/json" ||
                  init.headers["Content-Type"].toLowerCase() ===
                    "application/json;charset=utf-8"
                ) {
                  InsurifyObj.currentReqParams = JSON.parse(init.body);
                } else if (
                  init.headers["Content-Type"].toLowerCase() ===
                  "form/multipart"
                ) {
                  if (init.body instanceof FormData) {
                    for (var pair of init.body.entries()) {
                      InsurifyObj.currentReqParams[pair[0]] = pair[1];
                    }
                  }
                } else if (
                  init.headers["Content-Type"].toLowerCase() ===
                  "x-www-form-urlencoded"
                ) {
                  InsurifyObj.currentReqParams = InsurifyObj.convertUriParamsToJson(
                    init.body
                  );
                }
              } else {
                if (init.body instanceof FormData) {
                  InsurifyObj.currentReqParams = {};
                  for (var pair of init.body.entries()) {
                    InsurifyObj.currentReqParams[pair[0]] = pair[1];
                  }
                } else if (
                  typeof init.body === "object" &&
                  init.body !== null &&
                  init.body instanceof Object
                ) {
                  InsurifyObj.currentReqParams = JSON.parse(init.body);
                } else if (
                  typeof init.body === "string" &&
                  init.body !== "" &&
                  init.body instanceof String
                ) {
                  InsurifyObj.currentReqParams = InsurifyObj.convertUriParamsToJson(
                    init.body
                  );
                }
              }
              if (
                typeof InsurifyObj.currentReqParams.attributes === "undefined"
              ) {
                InsurifyObj.currentReqParams.attributes = {};
              }
              if (
                typeof InsurifyObj.currentReqParams.attributes[
                  "insurifyUpdate"
                ] === "undefined" ||
                typeof InsurifyObj.currentReqParams.attributes[
                  "insurifyUpdate"
                ] === "string"
              ) {
                // console.log('fetch:carthook');
                setTimeout(() => {
                  InsurifyObj.cartHookRender();
                }, 500);
              }
            } else {
              setTimeout(() => {
                InsurifyObj.cartHookRender();
              }, 500);
            }
          }
        }

        const response = await originalFetch(input, init);
        return await new Promise((resolve) => {
          if (response.url.indexOf("/cart.js") > -1) {
            response
              .clone() // we can invoke `json()` only once, but clone do the trick
              .json()
              .then((json) => {
                //debugger; // do what ever you want with response, even `resolve(new Response(body, options));`
                resolve(response);
              });
          } else {
            resolve(response);
          }
        });
      };
    }
    async getInsurifyStoreCart() {
      let InsurifyObj = this;
      const fetchRes = await fetch("/cart.js", { method: "GET" });
      if (fetchRes.status !== 200 || fetchRes.ok === false) {
        console.log(
          "Looks like there was a problem. Status Code: " + response.status
        );
        return;
      }
      InsurifyObj.currentInsurifyCart = await fetchRes.json();
    }
    cartHookRender() {
      let InsurifyObj = this;
      const fetchRes = fetch("/cart.js", { method: "GET" })
        .then(function (fetchRes) {
          if (fetchRes.status !== 200 || fetchRes.ok === false) {
            console.log(
              "Looks like there was a problem. Status Code: " + response.status
            );
            return;
          }
          return fetchRes.json();
        })
        .then(function (json) {
          InsurifyObj.currentInsurifyCart = json;
          InsurifyObj.cartAjaxCallBackFn(json);
          InsurifyObj.renderWidget();
          InsurifyObj.renderWidgetModal();
        })
        .catch(function (error) {
          console.log("Looks like there was a problem. Status Code: " + error);
          return;
        });
    }
    getInsurifySettings() {
      let InsurifyObj = this;
      fetch(insurifyController, {
        method: "POST",
        headers: requestHttpHeaders,
        body: JSON.stringify({
          shop: this.shop,
          getGeneralStoreSettings: 1,
        }),
      })
        .then(function (response) {
          if (response.status !== 200 || response.ok === false) {
            console.log(
              "Looks like there was a problem. Status Code: " + response.status
            );
            return;
          }
          return response.json();
        })
        .then(function (json) {
          InsurifyObj.generalSettings = json;
          //render widget
          InsurifyObj.renderInsurifyWidget();
        })
        .catch(function (err) {
          console.log("Error :-S", err);
        });
    }
    findInsurifySelectorDiv() {
      let inBodyElem = document.body;
      if (
        inBodyElem.contains(
          document.querySelector("." + this.widgetConfig.widgetRenderSelector)
        )
      ) {
        this.widgetElem = document.querySelector(
          "." + this.widgetConfig.widgetRenderSelector
        );
      } else if (
        inBodyElem.contains(
          document.querySelector("#" + this.widgetConfig.widgetRenderSelector)
        )
      ) {
        this.widgetElem = document.querySelector(
          "." + this.widgetConfig.widgetRenderSelector
        );
      }
      return this.widgetElem ? true : false;
    }
    /**
     * Format money values based on your shop currency settings
     * @param  {Number|string} cents - value in cents or dollar amount e.g. 300 cents
     * or 3.00 dollars
     * @param  {String} format - shop money_format setting
     * @return {String} value - formatted value
     */
    insurifyMoneyFormat(cents, format = "{{amount}}") {
      if (typeof cents == "string") {
        cents = cents.replace(".", "");
      }
      var value = "";
      var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
      var formatString = format || this.money_format;
      function defaultOption(opt, def) {
        return typeof opt == "undefined" ? def : opt;
      }
      function formatWithDelimiters(number, precision, thousands, decimal) {
        precision = defaultOption(precision, 2);
        thousands = defaultOption(thousands, ",");
        decimal = defaultOption(decimal, ".");
        if (isNaN(number) || number == null) {
          return 0;
        }
        number = (number / 100.0).toFixed(precision);
        var parts = number.split("."),
          dollars = parts[0].replace(
            /(\d)(?=(\d\d\d)+(?!\d))/g,
            "$1" + thousands
          ),
          cents = parts[1] ? decimal + parts[1] : "";
        return dollars + cents;
      }
      switch (formatString.match(placeholderRegex)[1]) {
        case "amount":
          value = formatWithDelimiters(cents, 2, "");
          break;
        case "amount_no_decimals":
          value = formatWithDelimiters(cents, 0);
          break;
        case "amount_with_comma_separator":
          value = formatWithDelimiters(cents, 2, ".", ",");
          break;
        case "amount_no_decimals_with_comma_separator":
          value = formatWithDelimiters(cents, 0, ".", ",");
          break;
        case "amount_with_apostrophe_separator":
          value = formatWithDelimiters(cents, 2, "'", ".");
          break;
      }
      return formatString.replace(placeholderRegex, value);
    }
    checkSubtotalInRange(subtotal, min, max) {
      let n = Number(subtotal);
      n = Math.min(max, Math.max(min, subtotal));
      return n;
    }
    cleanHtmlNode() {
      HTMLElement.prototype.empty = function () {
        let that = this;
        while (that.hasChildNodes()) {
          that.removeChild(that.lastChild);
        }
      };
    }
    renderWidget() {
      // if widget enable then
      // console.log(this.currentReqMethod,this.currentReqRoute,this.currentReqParams);
      let currentProtectionPrice = 0;
      let InsurifyObj = this;
      let currentCartData = this.currentInsurifyCart;
      let currentCartSubTotal = this.insurifyMoneyFormat(
        currentCartData.items_subtotal_price
      );
      let currentSubTotalRanges = this.InsurifySettings.insurifyProduct;
      let insurifyPlanType = this.InsurifySettings.insurifyPlanType;
      let defaultFee = this.InsurifySettings.defaultFee;
      let percentageFee = this.InsurifySettings.percentageFee;

      let getShipProtectionNode = {};
      let ultimateMax = 99999999999;
      let swatchStatus =
        parseInt(this.InsurifySettings.isSwatchDefaultSelected) >= 1
          ? true
          : false;
      let insurifySwatchDefaultSelectedCookie = this.__getCookie(
        "insurifySwatchDefaultSelected" + currentCartData.token
      )
        ? parseInt(
            this.__getCookie(
              "insurifySwatchDefaultSelected" + currentCartData.token
            )
          )
        : parseInt(this.InsurifySettings.isSwatchDefaultSelected);
      swatchStatus =
        parseInt(insurifySwatchDefaultSelectedCookie) >= 1 ? true : false;
      if (currentCartData.items.length === 0) {
        this.widgetElem.empty();
        return;
      }
      // check if cart has already insurify variant or not
      let existingProtectionNode = {};
      existingProtectionNode =
        currentCartData.items.length > 0 &&
        currentCartData.items.filter((node) => {
          return (
            node.product_id.toString() ===
            InsurifyObj.InsurifySettings.productId
          );
        })[0];
      if (typeof existingProtectionNode === "undefined") {
        existingProtectionNode = {};
      }
      // if protection node is exist then exclude their amount from cart subtotal
      let newSubtotalExcludingProtectionAmount = parseFloat(
        currentCartSubTotal
      );
      if (Object.keys(existingProtectionNode).length > 0) {
        let orginalLinePrice = parseFloat(
          this.insurifyMoneyFormat(existingProtectionNode.original_line_price)
        );
        newSubtotalExcludingProtectionAmount =
          parseFloat(currentCartSubTotal) - orginalLinePrice;
        currentCartSubTotal = newSubtotalExcludingProtectionAmount;
      }
      // check under which protection node range cart subtotal falling
      currentSubTotalRanges.sort((a, b) => {
        if (parseInt(a.subtotalRange) > parseInt(b.subtotalRange)) {
          return 1;
        }
        if (parseInt(a.subtotalRange) < parseInt(b.subtotalRange)) {
          return -1;
        }
        return 0;
      });
      if (currentSubTotalRanges.length > 0) {
        getShipProtectionNode = currentSubTotalRanges.filter((node, index) => {
          // let min = index === 0 ? (parseInt(0)+parseInt(1)) : (parseFloat(node.subtotalRange)-parseFloat(currentSubTotalRanges[(parseInt(index)-1)].subtotalRange))+1;
          // let max = index === (parseInt(currentSubTotalRanges.length)-1) ? parseFloat(ultimateMax) : parseFloat(node.subtotalRange);
          // if(index > 0){
          //     let rangeDiff = parseFloat(min)-parseFloat(currentSubTotalRanges[(parseInt(index)-1)].subtotalRange);
          //     if(parseInt(rangeDiff) != 1){
          //         min = parseFloat(currentSubTotalRanges[(parseInt(index)-1)].subtotalRange)+parseInt(1);
          //     }
          // }
          const currentIndex = index;
          const nextIndex = (currentIndex + 1) % currentSubTotalRanges.length;
          let min = parseFloat(node.subtotalRange);
          let max =
            nextIndex === 0
              ? parseFloat(ultimateMax)
              : parseFloat(
                  currentSubTotalRanges[parseInt(nextIndex)].subtotalRange
                );

          if (insurifyPlanType == "PERCENTAGE") {
            let calculateCartSubTotal =
              (parseFloat(currentCartSubTotal) * parseFloat(percentageFee)) /
              100;
            return (
              InsurifyObj.checkSubtotalInRange(
                calculateCartSubTotal,
                min,
                max
              ) === parseFloat(calculateCartSubTotal)
            );
          } else {
            return (
              InsurifyObj.checkSubtotalInRange(
                currentCartSubTotal,
                min,
                max
              ) === parseFloat(currentCartSubTotal)
            );
          }
        })[0];
      }

      if (typeof getShipProtectionNode === "undefined") {
        getShipProtectionNode = {};
      }
      // if subtotal not found in range then stop rendering
      if (Object.keys(getShipProtectionNode).length === 0) {
        this.widgetElem.empty();
        return;
      }
      // if default widget toggle checked then add protection node based on below calculation
      // set current and existing protection node values
      this.currentProtectionNodePrice = parseFloat(getShipProtectionNode.price);
      this.existingProtectionNodePrice = parseFloat(
        this.insurifyMoneyFormat(existingProtectionNode.original_price)
      );
      this.existingProtectionNodeVariant =
        existingProtectionNode.variant_id || "";
      this.currentProtectionNodeVariant = getShipProtectionNode.id || "";
      this.existingProtectionNodeVariantQty = parseInt(
        existingProtectionNode.quantity
      );
      if (this.currentProtectionNodePrice === 0) {
        this.widgetElem.empty();
        return;
      }
      currentProtectionPrice =
        getShipProtectionNode.price + " " + currentCartData.currency;
      // console.log(currentCartData);
      // console.log(getShipProtectionNode);
      // console.log(existingProtectionNode);
      // if variant exist then make swatch state active
      if (this.existingProtectionNodeVariant != "") {
        swatchStatus = true;
      }
      // console.log(swatchStatus);
      // creating HTMLDOMs nodes
      this.widgetElem.empty();
      let insurifyWidgetMainContainer = document.createElement("div");
      insurifyWidgetMainContainer.setAttribute("class", "blast-widget-shopify");
      let _insurifyWidgetSubContainer = document.createElement("div");
      _insurifyWidgetSubContainer.setAttribute(
        "class",
        "blast-widget mobile-align-undefined desktop-align-undefined"
      );
      _insurifyWidgetSubContainer.setAttribute("style", "display: flex;");
      let __insurifyWidgetSubContainerImage = document.createElement("img");
      __insurifyWidgetSubContainerImage.setAttribute(
        "src",
        this.InsurifySettings.insurifyWidgetLogo
      );
      __insurifyWidgetSubContainerImage.setAttribute("class", "bw-image");
      __insurifyWidgetSubContainerImage.setAttribute(
        "style",
        "width: 50px; height: 50px;"
      );
      let __insurifyWidgetSubContainerSpan = document.createElement("span");
      let __insurifyWidgetSubContainerContentDiv = document.createElement(
        "div"
      );
      __insurifyWidgetSubContainerContentDiv.setAttribute(
        "class",
        "bw-contents"
      );
      let ____insurifyWidgetSubContainerLeftDiv = document.createElement("div");
      ____insurifyWidgetSubContainerLeftDiv.setAttribute("class", "bw-left");
      let ____insurifyWidgetSubContainerCenterDiv = document.createElement(
        "div"
      );
      ____insurifyWidgetSubContainerCenterDiv.setAttribute(
        "class",
        "bw-center"
      );
      let _____insurifyWidgetSubContainerCenterTextTopDiv = document.createElement(
        "div"
      );
      _____insurifyWidgetSubContainerCenterTextTopDiv.setAttribute(
        "class",
        "bw-text-top"
      );
      _____insurifyWidgetSubContainerCenterTextTopDiv.innerHTML = this.InsurifySettings.insurifyHeader;
      let _____insurifyWidgetSubContainerCenterTextBottomDiv = document.createElement(
        "div"
      );
      _____insurifyWidgetSubContainerCenterTextBottomDiv.setAttribute(
        "class",
        "bw-text-bottom"
      );
      _____insurifyWidgetSubContainerCenterTextBottomDiv.innerHTML =
        this.InsurifySettings.insurifySubheader +
        "&nbsp;<strong>" +
        currentProtectionPrice +
        "</strong>";
      let _____insurifyWidgetSubContainerCenterTextBottomLinkDiv = document.createElement(
        "div"
      );
      _____insurifyWidgetSubContainerCenterTextBottomLinkDiv.innerHTML =
        '<div class="bw-text-bottom"><a id="lup-view-detail">View Detail</a></div>';
      let ____insurifyWidgetSubContainerRightDiv = document.createElement(
        "div"
      );
      ____insurifyWidgetSubContainerRightDiv.setAttribute("class", "bw-right");
      let _____insurifyWidgetSubContainerRightCheckboxLbl = document.createElement(
        "label"
      );
      let ______insurifyWidgetSubContainerRightCheckboxInput = document.createElement(
        "input"
      );
      ______insurifyWidgetSubContainerRightCheckboxInput.setAttribute(
        "class",
        "toggle_btn"
      );
      ______insurifyWidgetSubContainerRightCheckboxInput.setAttribute(
        "id",
        "toggle_btn"
      );
      ______insurifyWidgetSubContainerRightCheckboxInput.setAttribute(
        "type",
        "checkbox"
      );
      ______insurifyWidgetSubContainerRightCheckboxInput.checked = swatchStatus;
      let ______insurifyWidgetSubContainerRightCheckboxSliderSpan = document.createElement(
        "span"
      );
      if (this.InsurifySettings.toggleType == "CHECKBOX") {
        ____insurifyWidgetSubContainerRightDiv.setAttribute(
          "style",
          "margin-bottom: 20px;"
        );
        _____insurifyWidgetSubContainerRightCheckboxLbl.setAttribute(
          "class",
          "insurify-checkbox-container"
        );
        ______insurifyWidgetSubContainerRightCheckboxSliderSpan.setAttribute(
          "class",
          "insurify-checkbox-checkmark"
        );
      } else {
        _____insurifyWidgetSubContainerRightCheckboxLbl.setAttribute(
          "class",
          "bw-checkbox-span switch"
        );
        ______insurifyWidgetSubContainerRightCheckboxSliderSpan.setAttribute(
          "class",
          "slider round"
        );
      }
      let insurifyToolTipContentDiv = document.createElement("div");
      insurifyToolTipContentDiv.setAttribute("class", "blast-content");
      insurifyToolTipContentDiv.setAttribute("style", "float: right;");
      insurifyToolTipContentDiv.innerHTML = this.InsurifySettings.extraInfo;
      let insurifyCustomCssStyle = document.createElement("style");
      insurifyCustomCssStyle.type = "text/css";
      if (insurifyCustomCssStyle.styleSheet) {
        // This is required for IE8 and below.
        insurifyCustomCssStyle.styleSheet.cssText = this.InsurifySettings.insurifyCustomCss;
      } else {
        insurifyCustomCssStyle.appendChild(
          document.createTextNode(this.InsurifySettings.insurifyCustomCss)
        );
      }
      // appending HTMLDOMs under their respective container
      _____insurifyWidgetSubContainerRightCheckboxLbl.appendChild(
        ______insurifyWidgetSubContainerRightCheckboxInput
      );
      _____insurifyWidgetSubContainerRightCheckboxLbl.appendChild(
        ______insurifyWidgetSubContainerRightCheckboxSliderSpan
      );
      ____insurifyWidgetSubContainerRightDiv.appendChild(
        _____insurifyWidgetSubContainerRightCheckboxLbl
      );
      ____insurifyWidgetSubContainerCenterDiv.appendChild(
        _____insurifyWidgetSubContainerCenterTextTopDiv
      );
      ____insurifyWidgetSubContainerCenterDiv.appendChild(
        _____insurifyWidgetSubContainerCenterTextBottomDiv
      );
      ____insurifyWidgetSubContainerCenterDiv.appendChild(
        _____insurifyWidgetSubContainerCenterTextBottomLinkDiv
      );
      __insurifyWidgetSubContainerContentDiv.appendChild(
        ____insurifyWidgetSubContainerLeftDiv
      );
      __insurifyWidgetSubContainerContentDiv.appendChild(
        ____insurifyWidgetSubContainerCenterDiv
      );
      __insurifyWidgetSubContainerContentDiv.appendChild(
        ____insurifyWidgetSubContainerRightDiv
      );
      _insurifyWidgetSubContainer.appendChild(
        __insurifyWidgetSubContainerImage
      );
      _insurifyWidgetSubContainer.appendChild(__insurifyWidgetSubContainerSpan);
      _insurifyWidgetSubContainer.appendChild(
        __insurifyWidgetSubContainerContentDiv
      );
      insurifyWidgetMainContainer.appendChild(_insurifyWidgetSubContainer);
      this.widgetElem.appendChild(insurifyWidgetMainContainer);
      this.widgetElem.appendChild(insurifyToolTipContentDiv);
      // set toggle checked and add protection node into cart
      if (swatchStatus === true) {
        this.addProtectionNode();
      }
      // swatch toggle event
      ______insurifyWidgetSubContainerRightCheckboxInput.addEventListener(
        "change",
        function (event) {
          if (event.target.checked) {
            InsurifyObj.addProtectionNode(true);
            InsurifyObj.__setCookie(
              "insurifySwatchDefaultSelected" + currentCartData.token,
              1
            );
          } else {
            InsurifyObj.removeProtectionNode(true);
            InsurifyObj.InsurifySettings.isSwatchDefaultSelected = 0;
            InsurifyObj.__setCookie("insurifySwatchDefaultSelected", 0);
            InsurifyObj.__setCookie(
              "insurifySwatchDefaultSelected" + currentCartData.token,
              0
            );
          }
        }
      );
    }
    renderWidgetModal() {
      let element = document.getElementById("lup-myModal");
      if (element) {
        document.getElementById("lup-myModal").remove();
      }
      let iDiv = document.createElement("div");
      iDiv.id = "lup-myModal";
      iDiv.className = "lup-modal";
      let modalHtml = `<div class="lup-modal-content" id="lup-modal-content"><meta charset="utf-8"><meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1"><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" /><link rel="preconnect" href="https://fonts.gstatic.com"><link href="https://fonts.googleapis.com/css2?family=Titillium+Web:wght@300;400;600&display=swap" rel="stylesheet"><div id="route-info" class="lightbox-content route-modal" style="display: block;"><div class="route-modal-box"><img class="background" src='${insurifyAssestUri}insurify-modal-bg.png'><div class="route-modal-header"><img class="route-rm-route-logo" src="${insurifyAssestUri}insurify-logo.png"><img class="route-rm-route-logo-color" src="${insurifyAssestUri}insurify-logo.png"><div class="route-rm-secure-with">Secure your shipment and easily <br>resolve order issues with one tap.</div><img class="route-rm-close-modal lup-close" id="lup_close_btn" src="${insurifyAssestUri}insurify-modal-closeIcon.svg"></div><div class="route-modal-content"><div class="icon-box1"><span class="route-rm-icon-box1"><img class="route-rm-icon-box-image" src="${insurifyAssestUri}insurify-modal-info-1.png" alt="Secured your shipment"></span><div class="route-rm-text1">Protect orders from loss,<br> damage, or theft. Resolve<br> your issues without any hassle</div></div><div class="icon-box2"><span class="route-rm-icon-box2"><img class="route-rm-icon-box-image" src="${insurifyAssestUri}insurify-modal-info-2.png" alt="Instantly insured"></span> <div class="route-rm-text2">No Hassle claim issues, Get<br> refund or new item shipped<br> within 24 hours. Fast and Easy.</div></div><div class="icon-box3"><span class="route-rm-icon-box3"><img class="route-rm-icon-box-image" src="${insurifyAssestUri}insurify-modal-info-3.png" alt="One click claims"></span><div class="route-rm-text3">Refunds or reorders<br> in just a few clicks.</div></div></div><div class="route-modal-footer"><div class="rm-footer-1"><div class="route-rm-terms">This optional protection is offered to you solely in order to effectuate the shipment of your package(s).</div></div><div class="rm-footer-2"><div class="route-rm-copyright">© Insurify - 2021 - All Right Reserved</div><div class="route-rm-lloyds-container"><img class="route-rm-lloyds-image" src="${insurifyAssestUri}insurify-logo.png" alt=""></div></div></div></div></div></div></div>`;
      document.getElementsByTagName("body")[0].appendChild(iDiv);
      let modelContentElem = document.getElementById("lup-modal-content");
      let modal = document.getElementById("lup-myModal");
      let btn = document.getElementById("lup-view-detail");
      let span = document.getElementsByClassName("lup-close")[0];
      let _insurifyWidgetModalContainer = document.getElementById(
        "lup-myModal"
      );
      _insurifyWidgetModalContainer.innerHTML = modalHtml;
      let _insurifyViewDetailCloseBtn = document.getElementById(
        "lup_close_btn"
      );
      _insurifyViewDetailCloseBtn.addEventListener("click", function (event) {
        modal.style.display = "none";
      });
      let _insurifyViewDetail = document.getElementById("lup-view-detail");
      if (_insurifyViewDetail) {
        _insurifyViewDetail.addEventListener("click", function (event) {
          modal.style.display = "block";
        });
      }
    }
    async removeProtectionNode(swatchToggle = false) {
      let InsurifyObj = this;
      let bodyData = {};
      bodyData.updates = {};
      bodyData.updates[this.existingProtectionNodeVariant] = 0;
      if (swatchToggle === true) {
        bodyData.attributes = {};
        bodyData.attributes["insurifyUpdate"] = "";
      }
      let fetchRes = await fetch("/cart/update.js", {
        method: "post",
        body: JSON.stringify(bodyData),
        headers: requestHttpHeaders,
      });
      if (fetchRes.status !== 200 || fetchRes.ok === false) {
        console.log(
          "Looks like there was a problem. Status Code: " + fetchRes.status
        );
        return;
      }
    }
    addProtectionNode(swatchToggle = false) {
      let InsurifyObj = this;
      if (
        (this.existingProtectionNodePrice != this.currentProtectionNodePrice &&
          this.currentProtectionNodeVariant != "") ||
        this.existingProtectionNodeVariantQty > 1
      ) {
        let bodyData = {};
        bodyData.updates = {};
        bodyData.updates[this.currentProtectionNodeVariant] =
          parseInt(this.existingProtectionNodeVariantQty) || parseInt(1);
        if (this.existingProtectionNodeVariant != "") {
          bodyData.updates[this.existingProtectionNodeVariant] = 0;
        }
        if (swatchToggle === true) {
          bodyData.attributes = {};
          bodyData.attributes["insurifyUpdate"] = "";
        }
        fetch("/cart/update.js", {
          method: "post",
          body: JSON.stringify(bodyData),
          headers: requestHttpHeaders,
        })
          .then(function (fetchRes) {
            if (fetchRes.status !== 200 || fetchRes.ok === false) {
              console.log(
                "Looks like there was a problem. Status Code: " +
                  fetchRes.status
              );
              return;
            }
            return fetchRes.json();
          })
          .then(function (json) {
            // InsurifyObj.getInsurifyStoreCart();
          })
          .catch(function (error) {
            console.log("Error :-S", err);
          });
      }
    }
    renderInsurifyWidget() {
      if (this.InsurifySettings) {
        if (Object.keys(this.InsurifySettings).length > 0) {
          // if widget not enable then return
          if (parseInt(this.InsurifySettings.isInsurifyEnable) === 0) {
            return;
          }
          // check for insurify div
          if (!this.findInsurifySelectorDiv()) {
            return;
          }
          // import css
          this.checkloadjscssfile("insurify-modal.css", "css");
          // render widget
          if (this.isInitLoaded === 0) {
            this.renderWidget();
            this.renderWidgetModal();
            this.isInitLoaded = 1;
          }
        }
      }
    }
  }
  if (Object.keys(insuirfyWidget).length > 0) {
    let shStoreUri = insuirfyWidget.shop ? insuirfyWidget.shop : Shopify.shop;
    new InsurifyObj(shStoreUri);
  }
})(insuirfyWidget);
