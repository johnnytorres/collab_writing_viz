// ==UserScript==
// @name         WhoColor Userscript
// @namespace    https://www.wikiwho.net/whocolor/v1.0.0-beta/
// @version      1.1
// @description  Displays authorship information on wikipedia.
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js
// @require      https://www.wikiwho.net/static/whocolor/scripts/moment-with-locales.js
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_getResourceText
// @grant        GM_log
// @match        http://en.wikipedia.org/*
// @match        https://en.wikipedia.org/*
// @match        http://eu.wikipedia.org/*
// @match        https://eu.wikipedia.org/*
// @match        http://de.wikipedia.org/*
// @match        https://de.wikipedia.org/*
// @copyright    2015+, Felix Stadthaus
// ==/UserScript==

// The MIT License (MIT)
//
// Copyright (c) 2015 Felix Stadthaus
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

// See her for some resource licenses:
//
// https://commons.wikimedia.org/w/index.php?title=File:Clear_icon.svg&oldid=149014810
// https://commons.wikimedia.org/w/index.php?title=File:Article_icon.svg&oldid=148759157
// https://commons.wikimedia.org/w/index.php?title=File:ArticleSearch.svg&oldid=150569436
// https://commons.wikimedia.org/w/index.php?title=File:Speechbubbles_icon.svg&oldid=148758659
// By MGalloway (WMF) (Own work) [CC BY-SA 3.0 (http://creativecommons.org/licenses/by-sa/3.0)], via Wikimedia Commons
//
// https://commons.wikimedia.org/w/index.php?title=File:UserAvatar.svg&oldid=150569452
// By MGalloway (WMF) (Own work) [CC BY-SA 4.0 (http://creativecommons.org/licenses/by-sa/4.0)], via Wikimedia Commons
//
// https://commons.wikimedia.org/w/index.php?title=File:Speechbubbles_icon_green.svg&oldid=135292327
// By Chiefwei (Own work) [CC BY-SA 4.0 (http://creativecommons.org/licenses/by-sa/4.0)], via Wikimedia Commons
//
// http://www.ajaxload.info/ <-- The origin of ajax-loader.gif (License: WTFPL, http://www.wtfpl.net/)

Wikiwho = {
    /* A few configuration options */
    // Where to fetch Wikicolor data from
    wikicolorUrl: "https://www.wikiwho.net/",
    // wikicolorUrl: "http://127.0.0.1:8000/",

    // Color palette for highlighting of tokens (Kelly)
    tokenColors: [
        "#FFB300", "#803E75", "#FF6800", "#A6BDD7", "#C10020", "#CEA262", "#817066",
        // The following is not good for people with defective color vision
        "#007D34", "#F6768E", "#00538A", "#FF7A5C", "#53377A", "#FF8E00", "#B32851",
        "#F4C800", "#7F180D", "#93AA00", "#593315", "#F13A13", "#232C16"
    ],

    /* Other initial values */
    // Specifies whether the original, unaltered content is shown
    showingUnalteredContent: true,
    // True, when initialized has already been called to prevent double initialization
    initialized: false,
    // Array with colored authors (and the colors they are colored with)
    coloredAuthors: {},
    // Variable holding the timeout that deselects the currently selected author
    deselectTimeout: null,
    // Variable telling whether provenance or history or conflict or age view view is opened
    provenanceViewOpen: false,
    historyViewOpen: false,
    conflictViewOpen: false,
    ageViewOpen: false,
    ageLimitFrom: 0,  // days
    ageLimitTo: 360,  // days
    groupSize: 10,

    /* Methods */

    // Determines whether white or black are the more contrasting colors (via the YIQ color model)
    getContrastingColor: function(color){
        var red = parseInt(color.substr(1, 2), 16);
        var green = parseInt(color.substr(3, 2), 16);
        var blue = parseInt(color.substr(5, 2), 16);
        var yiq = (299*red + 587*green + 114*blue) / 1000;
        return (yiq >= 128) ? ['black', 'darkblue'] : ['white', 'lightblue'];
    },

    // Determines whether white or black are the more contrasting colors (via the YIQ color model)
    /*
    getContrastingColorRGB: function(red, green, blue){
        var yiq = (299*red + 587*green + 114*blue) / 1000;
        return (yiq >= 128) ? ['black', 'darkblue'] : ['white', 'lightblue'];
    },
    */

    // Creates basic HTML elements like menu bars or buttons etc.
    createHTMLElements: function() {
        // Holds the altered Wikimedia content HTML markup
        Wikiwho.newcontent = $("<div></div>");
        Wikiwho.newcontent.css('background', 'url(/static/client/images/ajax-loader.gif) no-repeat center center').css('min-height', '32px');

        // Holds the original, unaltered Wikimedia content HTML markup
        Wikiwho.originalcontent = $("#mw-content-text");

        // Add the altered content to the page (but hide it)
        $(Wikiwho.originalcontent[0].attributes).each(function() { Wikiwho.newcontent.attr(this.nodeName, this.value); });
        Wikiwho.originalcontent.after(Wikiwho.newcontent);
        //Wikiwho.newcontent.hide();

        // The button to switch into wikicolor mode
        //Wikiwho.onoffbutton = $('<li id="wikiwhoonoffbutton"><span><a>WhoColor</a></span></li>');
        //$("div#p-views ul").prepend(Wikiwho.onoffbutton);
        //Wikiwho.onoffbutton.find("a").click(function() { Wikiwho.onoffbuttonclick(); });

        // The menu on the right (displaying authors)
        var elementTop = $('#content').offset().top + 1;

        //Wikiwho.rightbar = $('<div id="wikiwhorightbar" class="mw-body"></div>').hide().prependTo($("div#content.mw-body"));
        Wikiwho.rightbar = $('<div id="wikiwhorightbar" class="mw-body"></div>').prependTo($("div#content.mw-body"));
        $("div#content.mw-body").css("position", "relative");
        Wikiwho.rightbar.css("top", "5em");
        Wikiwho.rightbar.css("right", "calc(-15.5em - 3px)");

        Wikiwho.rightbarcontent = $('<div></div>').appendTo(Wikiwho.rightbar);

        $(window).scroll(function(){
            if($(window).scrollTop() > elementTop){
                $('#wikiwhorightbar').css('top', '0px');
            } else {
                $('#wikiwhorightbar').css('top', (elementTop-$(window).scrollTop())+'px');
            }
        });

        $(window).scroll();

        // Editor list
        $('<input id="provenanceviewbutton" type="button" value="Provenance"/>').appendTo(Wikiwho.rightbarcontent);
        //$('<input id="conflictviewbutton" type="button" value="Conflict"/>').appendTo(Wikiwho.rightbarcontent);
        //$('<input id="ageviewbutton" type="button" value="Age"/>').appendTo(Wikiwho.rightbarcontent);
        $('<h2 id="wikiwhoAuthorListHeader">Editor List</h2>').appendTo(Wikiwho.rightbarcontent);
        $('<ul id="wikiwhoAuthorList"></ul>').appendTo(Wikiwho.rightbarcontent);
        // var today = new Date();
        // today.setMonth(today.getMonth() - Wikiwho.ageLimit);
        // $('<div><input id="ageLimit" type="date" name="Age Limit" value=' + moment(today).format('YYYY-MM-DD') + '></div>').appendTo(Wikiwho.rightbarcontent);
        $('<div id="ageLimitBox">'+
            '<label for="ageLimitFrom">Days from: </label><input id="ageLimitFrom" type="number" min="0" max="9999999999" value=' + Wikiwho.ageLimitFrom +'>'+
            '<br><br>'+
            '<label for="ageLimitTo">Days to: </label><input id="ageLimitTo" type="number" min="1" max="9999999999" value=' + Wikiwho.ageLimitTo +'>'+
            '<br><br>'+
            '<label for="groupSize">Group size: </label><input id="groupSize" type="number" min="1" max="9999999999" value=' + Wikiwho.groupSize +'>'+
            '<br><br>'+
            '<input id="ageLimitButton" type="button" value="Calculate"/>'+
          '</div>').appendTo(Wikiwho.rightbarcontent).hide();

        // Provenance view open button click event
        $('#provenanceviewbutton').click(function() {
            if(!Wikiwho.provenanceViewOpen) {
                // if provenance view is closed, conflict or age view must be open
                if (Wikiwho.conflictViewOpen) {
                    Wikiwho.closeConflictView();
                } else if (Wikiwho.ageViewOpen) {
                    Wikiwho.closeAgeView();
                }
            }
        });
        // Conflict view open button click event
        $('#conflictviewbutton').click(function() {
            if(Wikiwho.conflictViewOpen) {
                Wikiwho.closeConflictView();
            } else {
                Wikiwho.openConflictView();
            }
        });
        // Age view open button click event
        $('#ageviewbutton').click(function() {
            if(Wikiwho.ageViewOpen) {
                Wikiwho.closeAgeView();
            } else {
                Wikiwho.openAgeView();
            }
        });
        $('#ageLimitButton').click(function(){
            Wikiwho.ageLimitFrom = $('#ageLimitFrom').val();
            Wikiwho.ageLimitTo = $('#ageLimitTo').val();
            Wikiwho.groupSize = $('#groupSize').val();
            Wikiwho.openAgeView();
        });
        $('#ageLimitFrom, #ageLimitTo, #groupSize').on("keypress", function(e){
            if (e.keyCode === 13) {
                Wikiwho.ageLimitFrom = $('#ageLimitFrom').val();
                Wikiwho.ageLimitTo = $('#ageLimitTo').val();
                Wikiwho.groupSize = $('#groupSize').val();
                Wikiwho.openAgeView();
            }
        });

        // The sequence history
        Wikiwho.seqHistBox = $('<div id="wikiwhoseqhistbox"></div>').hide().appendTo($("div#content.mw-body"));
        Wikiwho.seqHistBox.append('<div id="wikiwhoseqhistboxopenindicator"><a>&#9650; Click here to open the WhoColor token history for the selected text &#9650;</a></div>');
        Wikiwho.seqHistBox.append('<div id="wikiwhoseqhistboxtoolongindicator">Selected text part is too long for the WhoColor token history</div>');
        Wikiwho.seqHistBox.append('<div id="wikiwhoseqhistboxonerevindicator">All the selected wiki markup was added in the currently viewed revision.</div>');
        Wikiwho.seqHistBox.append('<img src="' + Wikiwho.wikicolorUrl + 'static/whocolor/images/' + 'Clear_icon.svg" class="hvcloseicon"/>');
        Wikiwho.histview = $('<div id="wikiwhoseqhistview"></div>').appendTo(Wikiwho.seqHistBox);
    },

    onoffbuttonclick: function() {
        Wikiwho.onoffbutton.toggleClass("selected");
        if(Wikiwho.showingUnalteredContent) {
            Wikiwho.showAlteredContent();
        }else{
            Wikiwho.showUnalteredContent();
        }
    },

    showAlteredContent: function() {
        // Don't do anything if already showing the altered content
        if(!Wikiwho.showingUnalteredContent) return true;

        // The actual content replacement (just visual for the sake of speed)
        Wikiwho.originalcontent.attr("id", "old-mw-content-text");
        Wikiwho.newcontent.attr("id", "mw-content-text");
        Wikiwho.originalcontent.fadeOut(250, function() { Wikiwho.originalcontent.hide(); Wikiwho.newcontent.fadeIn(250, function() { Wikiwho.newcontent.show(); }); });
        //Wikiwho.newcontent.show();
        //Wikiwho.originalcontent.attr("id", "old-mw-content-text").hide();
        //Wikiwho.newcontent.attr("id", "mw-content-text");

        // Squeeze main content a bit and show the bar to the right
        //$("div#content").css("margin-right", "251px");
        Wikiwho.rightbar.animate({"right": "0px"}, 500, function() {});
        $("div#content").animate({"margin-right": "15.5em"}, 500, function() {});
        Wikiwho.rightbar.show();

        // Change flag
        Wikiwho.showingUnalteredContent = false;
        $('#provenanceviewbutton').addClass('provenanceviewbuttonopen');
        $('#conflictviewbutton').removeClass('conflictviewbuttonopen');
        $('#ageviewbutton').removeClass('ageviewbuttonopen');
    },

    showUnalteredContent: function() {
        // Don't do anything if already showing the unaltered content
        if(Wikiwho.showingUnalteredContent) return true;

        // The actual content replacement (just visual for the sake of speed)
        //Wikiwho.originalcontent.show();
        Wikiwho.newcontent.attr("id", "new-mw-content-text");
        Wikiwho.originalcontent.attr("id", "mw-content-text");
        Wikiwho.newcontent.fadeOut(250, function() { Wikiwho.newcontent.hide(); Wikiwho.originalcontent.fadeIn(250, function() { Wikiwho.originalcontent.show(); }); });

        // Unsqueeze main content and hide the bar to the right
        //$("div#content").css("margin-right", "");
        //$("div#content").animate({"margin-right": ""}, 500, function() { Wikiwho.rightbar.hide(); });
        Wikiwho.rightbar.animate({"right": "-15.6em"}, 500, function() { Wikiwho.rightbar.hide(); });
        $("div#content").animate({"margin-right": ""}, 500, function() {});
        //Wikiwho.rightbar.hide();

        // Change flag
        Wikiwho.showingUnalteredContent = true;
    },

    // Restore the original Mediawiki content
    restoreMWContent: function() {
        Wikiwho.originalcontent.show();
        Wikiwho.newcontent.hide();
    },

    // get Wikiwho author data via ajax
    getWikiwhoData: function() {
        if(!Wikiwho.tries) Wikiwho.tries = 0;
        Wikiwho.tries++;

        if(Wikiwho.tries > 3) {
            // Failed 3 times, stop trying
            // Check error and info messages
            if(typeof Wikiwho.api_info !== "undefined") {
                alert(Wikiwho.api_info);
            } else if (typeof Wikiwho.api_error !== "undefined") {
                alert(Wikiwho.api_error);
            } else {
                alert("Failed to retrieve valid WikiWho data.");
            }
            return;
        }

        var queryDict = {};
        location.search.substr(1).split("&").forEach(function(item) {queryDict[item.split("=")[0]] = item.split("=")[1]});

        //    "title": $("h1#firstHeading").text()
        var wiki_lang = location.hostname.split('.')[0];
        var ajax_url = Wikiwho.wikicolorUrl + wiki_lang + "/whocolor/v1.0.0-beta/" + encodeURIComponent($("h1#firstHeading").text().trim()) + "/";
        if(queryDict["oldid"]) {
            ajax_url = ajax_url + queryDict["oldid"] + "/";
        }
        jQuery.ajax({
            url: 'http://127.0.0.1:8000/documents/',
            method: 'GET',
            // data: data,
            dataType: "json",
            success: Wikiwho.wikiwhoDataCallback,
            error: function() {
                // Request failed, try again
                setTimeout(Wikiwho.getWikiwhoData, 5000);  // 5 seconds
                return;
            }
        });
    },



    wikiwhoDataCallback: function(data) {
        Wikiwho.api_success = data.success;
        Wikiwho.api_info = data.info;
        Wikiwho.api_error = data.error;
        // Retry when no success
//         if(Wikiwho.api_success !== true) {
//             setTimeout(Wikiwho.getWikiwhoData, 5000);
//             return;
//         }

        // Add extended markup content
        Wikiwho.newcontent.append(data.html);

        // Remove loading indicator
        Wikiwho.newcontent.css('background', '').css('min-height', '');

        // Save author and revision data
        Wikiwho.present_editors = data.editors;  // [[editor_name, editor/class_name, editor_score]]
        Wikiwho.tokens = data.tokens;  // [[conflict_score, str, o_rev_id, in, out, editor/class_name, age]]
        Wikiwho.tokencount = Wikiwho.tokens.length;
        Wikiwho.revisions = data.revisions;  // {rev_id: [timestamp, parent_id, class_name/editor, editor_name]}
        Wikiwho.biggest_conflict_score = parseInt(data.conflict_score);
        Wikiwho.rev_id = parseInt(data.rev_id);

        // Fill right panel with data
        Wikiwho.fillRightPanel();

        // Add token events for WikiWho markup
        Wikiwho.addTokenEvents();

        // Add history view events
        // Add code handling text selections of Wikitext
        Wikiwho.addSelectionEvents();
        // Add code to make the history view work
        //Wikiwho.addHistoryEvents();

        // Handle image selection outlines
        $('span.editor-token').has("img").addClass("editor-token-image");

        // Debug output (color tokens in alternating colors)
        // $(".editor-token").filter(":odd").css("background-color", "green");
        // $(".editor-token").filter(":even").css("background-color", "yellow");

        Wikiwho.showAlteredContent();
    },

    addHistoryEvents: function() {
        // Open history view when open indicator is clicked
        Wikiwho.seqHistBox.click(function() {
            // Check whether open indicator was clicked
            if($(this).hasClass("indicator") && (!$(this).hasClass("indicatortoolong")) && (!$(this).hasClass("indicatoronerev"))) {
                // Calculate height of marked text part
                var selectionHeight = Wikiwho.seqEndToken.offset().top + Wikiwho.seqEndToken.outerHeight(false) - Wikiwho.seqStartToken.offset().top;

                // Calculate optimal history view height
                var maxviewheight = $(window).height() - (selectionHeight + 20);

                // Check whether selected text is too long
                if((maxviewheight < $(window).height()/5) || (maxviewheight < 150)) {
                    // OK, that's too much at once :(
                    Wikiwho.seqHistBox.addClass("indicatortoolong");
                    return;
                }

                // Prepare open animation
                Wikiwho.histview.css("height", "");
                Wikiwho.seqHistBox.css("max-height", Wikiwho.seqHistBox.height()+"px");
                Wikiwho.seqHistBox.removeClass("indicator");
                Wikiwho.seqHistBox.animate({"max-height": maxviewheight+"px"}, 500, function() {
                    Wikiwho.seqHistBox.css("max-height", "calc(100% - "+(selectionHeight + 20)+"px)");

                    // Fix sizes
                    $(window).resize();
                });

                // Mark history view as open
                Wikiwho.historyViewOpen = true;

                // Reset some variables
                Wikiwho.hvhiddenTokens = new Array();
                Wikiwho.hvhiddenRevisions = new Array();
                Wikiwho.hvhiddenTokenDummies = new Array();

                // Remove body scrollbars
                $("body").css("overflow", "hidden");

                // Scroll body to text passage
                $('html, body').animate({
                    scrollTop: Wikiwho.seqStartToken.offset().top - 10
                }, 500);

                // Get start and end ID
                var startTokenId = parseInt(Wikiwho.seqStartToken.attr("id").slice(6));
                Wikiwho.startTokenId = startTokenId;
                var endTokenId = parseInt(Wikiwho.seqEndToken.attr("id").slice(6));
                if(Wikiwho.selectionEndTokenId) {
                    endTokenId = parseInt(Wikiwho.selectionEndTokenId) - 1;
                }
                Wikiwho.endTokenId = endTokenId;

                // Clear and reset history view
                Wikiwho.histview.empty();
                var leftbox = $('<div id="wikiwhoseqhistleftbox"></div>').appendTo(Wikiwho.histview);
                var middlebox = $('<div id="wikiwhoseqhistmiddlebox"></div>').appendTo(Wikiwho.histview);
                var rightbox = $('<div id="wikiwhoseqhistrightbox"></div>').appendTo(Wikiwho.histview);

                // Populate history view
                var revisionsById = {};
                var revisionArr = new Array();
                revisionArr.push(Wikiwho.rev_id);
                revisionsById[Wikiwho.rev_id] = moment.utc(Wikiwho.revisions[Wikiwho.rev_id][0]);  // timestamp
                var compiledTokens = new Array();

                for (i = startTokenId; i <= endTokenId; i++) {
                    var token_data = Wikiwho.tokens[i];
                    var tokenrevlist = new Array();

                    // origin rev id
                    var revid = parseInt(token_data[2]);
                    if(!(revid in revisionsById)) {
                        revisionArr.push(revid);
                        revisionsById[revid] = moment.utc(Wikiwho.revisions[revid][0]);
                    }
                    tokenrevlist.push(revid);

                    // re-inserts (ins)
                    token_data[3].forEach(function(entry) {
                        var revid = parseInt(entry);
                        if(!(revid in revisionsById)) {
                            revisionArr.push(revid);
                            revisionsById[revid] = moment.utc(Wikiwho.revisions[revid][0]);
                        }
                        tokenrevlist.push(revid);
                    });

                    // deletions (outs)
                    token_data[4].forEach(function(entry) {
                        var revid = parseInt(entry);
                        if(!(revid in revisionsById)) {
                            revisionArr.push(revid);
                            revisionsById[revid] = moment.utc(Wikiwho.revisions[revid][0]);
                        }
                        tokenrevlist.push(revid);
                    });

                    tokenrevlist.sort(function(a, b){
                        var aD = revisionsById[a];
                        var bD = revisionsById[b];
                        return aD>bD ? -1 : aD<bD ? 1 : 0;
                    });

                    compiledTokens.push(tokenrevlist);
                }

                revisionArr.sort(function(a, b){
                    var aD = revisionsById[a];
                    var bD = revisionsById[b];
                    return aD>bD ? -1 : aD<bD ? 1 : 0;
                });

                for(var i = 0; i < revisionArr.length; i++){
                    var revinfoline = $('<div class="hvrevhead hvrevhead-'+revisionArr[i]+'"></div>').appendTo(leftbox);

                    // Show diff links
                    var article_title = encodeURIComponent($("h1#firstHeading").text().trim());
                    if(i !== 0) {
                        revinfoline.append(
                            $('<div class="hvrevdifflinks"><a target="_blank" href="/w/index.php?title='
                                +article_title
                                +'&amp;diff='
                                +Wikiwho.rev_id
                                +'&amp;oldid='
                                +revisionArr[i]
                                +'"><img src="'
                                + Wikiwho.wikicolorUrl
                                + 'static/whocolor/images/'
                                +'ArticleSearch.svg" class="hvdifficon"/></a></div>')
                        );
                    }
                    var updownarrow = $('<span class="hvupdownarrow"></span>');
                    $('<a target="_blank" href="/w/index.php?title='
                      +article_title
                      +'&amp;diff='
                      +revisionArr[i]
                      +'&amp;oldid='
                      +Wikiwho.revisions[revisionArr[i]][1]  // parent_id
                      +'" title="'
                      +article_title
                      +'"></a>').html("&#8597;").appendTo(updownarrow);

                    // Append date and time
                    revinfoline.append($('<div class="hvrevdate"></div>').text(revisionsById[revisionArr[i]].format('YYYY-MM-DD')));

                    // Append spacer
                    revinfoline.append($('<div class="hvspacer"></div>'));

                    // Append author
                    revinfoline.append($('<div class="hvrevauthor"></div>').text(Wikiwho.revisions[revisionArr[i]][3]).addClass("hvauthorid-"+Wikiwho.revisions[revisionArr[i]][2]).append($('<div class="hvspacerauth">                                   </div>')));

                    // Append distance to next revision in list
                    if(i !== revisionArr.length - 1) {
                        var datetimediff = $('<div class="hvdatetimediff"></div>');
                        revinfoline.append(datetimediff);
                        datetimediff.append($('<span class="hvlefttimediff"></span>').text(revisionsById[revisionArr[i+1]].from(revisionsById[revisionArr[i]], true)));
                        datetimediff.append(updownarrow);

                        // Calculate distance in revisions
                        // TODO: Make this more efficient (maybe restructure data sent from API?)
                        var counter = 0;
                        var iterrevid = revisionArr[i];
                        var targetid = revisionArr[i+1];
                        while(iterrevid !== targetid) {
                            counter++;
                            iterrevid = Wikiwho.revisions[iterrevid][1]; // parent_id
                        }
                        datetimediff.append($('<span class="hvrighttimediff"></span>').text(counter + (counter===1 ? " revision" : " revisions")));
                    }
                }

                var tokenheaders = $('<div class="hvtokenheaders"></div>').appendTo(middlebox);
                var tokenbodies = $('<div class="hvtokenbodies"></div>').appendTo(middlebox);

                for (i = startTokenId; i <= endTokenId; i++) {
                    token_data = Wikiwho.tokens[i];
                    var htmltoken = $('<span id="token-age-'+i+'"></span>').text(token_data[1]);
                    htmltoken.addClass("editor-token token-editor-"+token_data[5]);
                    htmltoken.addClass("editor-token-"+i);
                    tokenheaders.append($('<div class="hvtokenhead hvtokenhead-'+i+'"></div>').append(htmltoken));
                    var tokencol = $('<div class="hvtokencol hvtokencol-'+i+'"></div>').appendTo(tokenbodies);
                    var tokenwidth = htmltoken.parent().outerWidth(true);
                    var tokenrevindex = 0;
                    var tokeninarticle = true;
                    for (var revindex = 0; revindex < revisionArr.length - 1; revindex++) {
                        if(revisionArr[revindex] === compiledTokens[i-startTokenId][tokenrevindex]) {
                            tokeninarticle = !tokeninarticle;
                            tokenrevindex++;
                        }
                        tokencol.append($('<div style="width: ' + (tokenwidth  -2) + 'px;" class="hvtokencolpiece hvtokencolpiece-'+revisionArr[revindex]+' ' + (tokeninarticle ? "hvtokeninarticle" : "hvtokennotinarticle")  + '"></div>'));
                    }
                }

                // Fix scrolling
                tokenheaders.bind('wheel', function(e){
                    var scrollTo = e.originalEvent.deltaX + tokenbodies.scrollLeft();
                    tokenbodies.scrollLeft(scrollTo);
                });
                leftbox.bind('wheel', function(e){
                    var scrollTo = e.originalEvent.deltaY + tokenbodies.scrollTop();
                    tokenbodies.scrollTop(scrollTo);
                });
                tokenbodies.scroll(function() {
                    tokenheaders.scrollLeft($(this).scrollLeft());
                    leftbox.scrollTop($(this).scrollTop());
                });
                tokenheaders.append($('<div class="hvtokenheadspacer"></div>'));

                // Add resizing events
                $(window).resize(function() {
                    if(leftbox.get(0).scrollHeight >= Wikiwho.seqHistBox.height()) {
                        Wikiwho.histview.css("height", "calc("+($(window).height() - (selectionHeight + 20))+"px - 2.75em - 1px)");
                    }else{
                        Wikiwho.histview.css("height", "");
                    }
                });

                // Check for special case (only one revision in list)
                if(revisionArr.length === 1) {
                    Wikiwho.seqHistBox.addClass("indicator indicatoronerev");

                    // Remove resizing events
                    $(window).off("resize");

                    // Mark history view as closed
                    Wikiwho.historyViewOpen = false;

                    // Restore body scrollbars
                    $("body").css("overflow", "");
                }

                // Add author click events
                leftbox.find(".hvrevauthor").click(function() {
                    var editor = $(this).attr('class').match(/hvauthorid-([a-f0-9]+)/)[1];
                    $("li#editor-"+editor).click();
                    return false;
                });

                // Add author hover events
                leftbox.find(".hvrevauthor").hover(function(event) {
                    // Mousein event handler
                    var editor = $(this).attr('class').match(/hvauthorid-([a-f0-9]+)/)[1];

                    // Call the general hover handler
                    Wikiwho.hoverToken(editor);
                }, function(event) {
                    // Mouseout event handler
                    Wikiwho.deselectTimeout = setTimeout(function(){
                        // Remove all selection markers
                        $(".editor-token").removeClass("selected hvselected");
                        $(".hvrevauthor").removeClass("selected");
                        $("#wikiwhorightbar li").removeClass("selected");
                    }, 500);
                });

                // Color tokens
                Object.keys(Wikiwho.coloredAuthors).forEach(function(editor) {
                    var color = Wikiwho.coloredAuthors[editor];
                    var contrastColor = Wikiwho.getContrastingColor(color);
                    $("span.token-editor-"+editor).css({"background-color": color, "color": contrastColor[0]}).find("*").css("color", contrastColor[1]);
                    $("div.hvauthorid-"+editor).css({"background-color": color, "color": contrastColor[0]});
                });

                // Color tokens differently if conflict view open
                if(Wikiwho.conflictViewOpen) {
                    Wikiwho.openConflictView();
                }

                // Add hover events
                $('div.hvtokenheaders span.editor-token').hover(function(event) {
                    // Mousein event handler
                    var editor = $(this).attr('class').match(/token-editor-([a-f0-9]+)/)[1];
                    var tokenid = $(this).attr('id').slice(10);

                    // Call the general hover handler
                    Wikiwho.hoverToken(editor);

                    // Select token with red outline
                    // TODO is this correct?
                    // $("#token-age-"+tokenid).removeClass("selected").addClass("hvselected");
                    $(this).removeClass("selected").addClass("hvselected");
                }, function(event) {
                    // Mouseout event handler
                    Wikiwho.deselectTimeout = setTimeout(function(){
                        // Remove all selection markers
                        $(".author-token").removeClass("selected hvselected");
                        $(".hvrevauthor").removeClass("selected");
                        $("#wikiwhorightbar li").removeClass("selected");
                    }, 500);
                });

                // Add click events
                $('div.hvtokenheaders span.editor-token').click(function() {
                    var editor = $(this).attr('class').match(/token-editor-([a-f0-9]+)/)[1];
                    $("#editor-"+editor).click();
                    return false;
                });

                // Add hide events (rightclick)
                $('div.hvtokenheaders span.editor-token').bind("contextmenu",function(e){
                    var editor = $(this).attr('class').match(/token-editor-([a-f0-9]+)/)[1];
                    var tokenid = $(this).attr('id').slice(10);

                    Wikiwho.hvHideToken(parseInt(tokenid), parseInt(editor), revisionArr, compiledTokens, revisionsById, true);

                    return false;
                });

                // Open history view
                Wikiwho.seqHistBox.animate({"max-height": maxviewheight+"px"}, 500, function() {
                    Wikiwho.seqHistBox.css("max-height", "calc(100% - "+(selectionHeight + 20)+"px)");

                    // Fix sizes
                    // $(window).resize();
                });
            }
        });

        // Close history box when close icon is clicked
        $("img.hvcloseicon").click(function() {
            // Remove resizing events
            $(window).off("resize");

            // Close animation
            Wikiwho.seqHistBox.css("max-height", Wikiwho.seqHistBox.outerHeight(false) + "px");
            Wikiwho.seqHistBox.animate({"max-height": "0px"}, 500, function() {
                Wikiwho.seqHistBox.hide();
                Wikiwho.seqHistBox.css("max-height", "");
                // Restore body scrollbars
                $("body").css("overflow", "");
            });

            // Mark history view as closed
            Wikiwho.historyViewOpen = false;
        });
    },

    hvHideToken: function(tokenid, authorid, revisionArr, compiledTokens, revisionsById, animation) {
        Wikiwho.hvhiddenTokens.push(tokenid);

        // Search for already matching token dummies
        var foundDummies = new Array();
        for(i = 0; i < Wikiwho.hvhiddenTokenDummies.length; i++) {
            var dummy = Wikiwho.hvhiddenTokenDummies[i];

            // Check for removed dummies
            if(dummy === undefined) continue;

            if ((dummy["start"] === tokenid + 1) || (dummy["end"] === tokenid - 1)) {
                foundDummies.push(dummy);
            }
        }

        // Check how many matching dummies were found
        if(foundDummies.length === 0) {
            // No dummy matching, add one
            var newid = Wikiwho.hvhiddenTokenDummies.length;
            var htmltoken = $('<span></span>').text("[...]");
            var dummyobj = $('<div class="hvtokenhead hvtokenheaddummy hvtokenheaddummy-'+newid+'"></div>').append(htmltoken).insertAfter($('div.hvtokenheaders span.editor-tokenid-'+tokenid).parent());
            var tokencol = $('<div class="hvtokencol hvtokendummycol hvtokendummycol-'+newid+'"></div>').insertAfter($('div.hvtokenbodies div.hvtokencol-'+tokenid));
            var tokenwidth = htmltoken.parent().outerWidth(true);
            for (var revindex = 0; revindex < revisionArr.length - 1; revindex++) {
                tokencol.append($('<div style="width: ' + (tokenwidth  -2) + 'px;" class="hvtokencolpiece hvtokencolpiece-'+revisionArr[revindex]+' hvtokencoldummy"></div>'));
            }

            dummy = {
                'start': tokenid,
                'end': tokenid,
                'object': dummyobj,
                'colobj': tokencol,
                'id': newid
            };

            dummyobj.click(function() {
                Wikiwho.hvRestoreDummy(dummy, revisionArr, compiledTokens, revisionsById, true);
            });

            Wikiwho.hvhiddenTokenDummies[newid] = dummy;

            // Animation
            var dummywidth = dummyobj.width();
            var tokencolwidth = tokencol.width();
            if(animation) {
                dummyobj.css('width', '0px');
                tokencol.css('width', '0px');
                dummyobj.animate({'width': dummywidth+'px'}, 500, function() {
                    $(this).css("width", "");
                });
                tokencol.animate({'width': tokencolwidth+'px'}, 500, function() {
                    $(this).css("width", "");
                });
            }
        }else if(foundDummies.length === 1) {
            // One dummy matching, add to dummy
            dummy = foundDummies[0];
            var dummyid = dummy['id']
            if(dummy['start'] === tokenid + 1) {
                dummy['start']--;
            }else{
                dummy['end']++;
            }

            Wikiwho.hvhiddenTokenDummies[dummyid] = dummy;
        }else{
            if(animation) {
                foundDummies[1]['object'].animate({'width': '0px'}, 500, function() {
                    $(this).remove();
                });
                foundDummies[1]['colobj'].animate({'width': '0px'}, 500, function() {
                    $(this).remove();
                });
            }else{
                foundDummies[1]['object'].remove();
                foundDummies[1]['colobj'].remove();
            }
            if(foundDummies[0]['start'] > foundDummies[1]['start']) foundDummies[0]['start'] = foundDummies[1]['start'];
            if(foundDummies[0]['end'] < foundDummies[1]['end']) foundDummies[0]['end'] = foundDummies[1]['end'];
            Wikiwho.hvhiddenTokenDummies[foundDummies[1]['id']] = undefined;
        }

        // Actual hiding of token column
        if(animation) {
            $('.hvtokenhead-'+tokenid).animate({'width': '0px'}, 500, function() {
                $(this).hide();
                $(this).css("width", "");
            });
            $('.hvtokencol-'+tokenid).animate({'width': '0px'}, 500, function() {
                $(this).hide();
                $(this).css("width", "");
            });
        }else{
            $('.hvtokenhead-'+tokenid).hide();
            $('.hvtokencol-'+tokenid).hide();
        }

        // Rehide rows that should already be hidden (in case a new dummy was added)
        for(i = 0; i < Wikiwho.hvhiddenRevisions.length; i++) {
            $('.hvrevhead-'+Wikiwho.hvhiddenRevisions[i]).hide();
            $('.hvtokencolpiece-'+Wikiwho.hvhiddenRevisions[i]).hide();
        }

        // Check whether we can hide rows as well
        var newRevisionArray = new Array();
        for(var i = 0; i < compiledTokens.length; i++) {
            // Skip token if hidden
            if(Wikiwho.hvhiddenTokens.indexOf(Wikiwho.startTokenId + i) !== -1) {
                continue;
            }
            // Add revisions of this token to array if not already in there
            for(var i2 = 0; i2 < compiledTokens[i].length; i2++) {
                if(newRevisionArray.indexOf(compiledTokens[i][i2]) === -1) {
                    newRevisionArray.push(compiledTokens[i][i2]);
                }
            }
        }
        // Go through real revision array and hide all revisions that are not in the new revision array and not already hidden
        for(i = 1; i < revisionArr.length; i++) {
            if(newRevisionArray.indexOf(revisionArr[i]) === -1) {
                // Revision not in new revision array
                if(Wikiwho.hvhiddenRevisions.indexOf(revisionArr[i]) === -1) {
                    // Not hidden yet, hide
                    if(animation) {
                        $('.hvrevhead-'+revisionArr[i]).animate({'height': '0px'}, 500, function() {
                            $(this).hide();
                            $(this).css("height", "");
                        });
                        $('.hvtokencolpiece-'+revisionArr[i]).animate({'height': '0px'}, 500, function() {
                            $(this).hide();
                            $(this).css("height", "");
                        });
                    }else{
                        $('.hvrevhead-'+revisionArr[i]).hide();
                        $('.hvtokencolpiece-'+revisionArr[i]).hide();
                    }

                    // Get index of previous shown revision
                    var previousRevIndex = i - 1;
                    while(Wikiwho.hvhiddenRevisions.indexOf(revisionArr[previousRevIndex]) !== -1) {
                        previousRevIndex--;
                    }

                    // Get index of next shown revision
                    var nextRevIndex = i + 1;
                    while((nextRevIndex < revisionArr.length) && (Wikiwho.hvhiddenRevisions.indexOf(revisionArr[nextRevIndex]) !== -1)) {
                        nextRevIndex++;
                    }
                    if(nextRevIndex === revisionArr.length) {
                        // Shouldn't show a diff
                        // TODO
                    }else{
                        // Calculate and update new date diff data of previous shown revision
                        $('.hvrevhead-'+revisionArr[previousRevIndex]+' .hvlefttimediff').text(revisionsById[revisionArr[nextRevIndex]].from(revisionsById[revisionArr[previousRevIndex]], true));

                        // Calculate distance in revisions
                        // TODO: Make this more efficient (maybe restructure data sent from API?)
                        var counter = 0;
                        var iterrevid = revisionArr[previousRevIndex];
                        var targetid = revisionArr[nextRevIndex];
                        while(iterrevid !== targetid) {
                            counter++;
                            iterrevid = Wikiwho.revisions[iterrevid][1];  // parent_id
                        }

                        // Update distance in revisions
                        $('.hvrevhead-'+revisionArr[previousRevIndex]+' .hvrighttimediff').text(counter + (counter===1 ? " revision" : " revisions"));
                    }

                    // Add to hvhiddenRevisions array
                    Wikiwho.hvhiddenRevisions.push(revisionArr[i]);
                }
            }
        }
    },

    hvRestoreDummy: function(dummy, revisionArr, compiledTokens, revisionsById, animation) {
        // Remove dummy objects
        dummy['object'].remove();
        dummy['colobj'].remove();

        // Show token columns again
        for(i = dummy["start"]; i <= dummy["end"]; i++) {
            // Actual showing of token column
            var headwidth = $('.hvtokenhead-'+i).width();
            var colwidth = $('.hvtokencol-'+i).width();
            if(animation) {
                $('.hvtokenhead-'+i).css('width', '0px');
                $('.hvtokencol-'+i).css('width', '0px');
            }
            $('.hvtokenhead-'+i).show();
            $('.hvtokencol-'+i).show();
            if(animation) {
                $('.hvtokenhead-'+i).animate({'width': headwidth+'px'}, 500, function() {
                    $(this).css("width", "");
                });
                $('.hvtokencol-'+i).animate({'width': colwidth+'px'}, 500, function() {
                    $(this).css("width", "");
                });
            }

            // Remove tokens from hidden tokens array
            Wikiwho.hvhiddenTokens.splice(Wikiwho.hvhiddenTokens.indexOf(i), 1);
        }

        // Remove dummy from array
        Wikiwho.hvhiddenTokenDummies[dummy['id']] = undefined;

        // Check whether we can show rows as well
        var newRevisionArray = new Array();
        for(i = 0; i < compiledTokens.length; i++) {
            // Skip token if hidden
            if(Wikiwho.hvhiddenTokens.indexOf(Wikiwho.startTokenId + i) !== -1) {
                continue;
            }
            // Add revisions of this token to array if not already in there
            for(i2 = 0; i2 < compiledTokens[i].length; i2++) {
                if(newRevisionArray.indexOf(compiledTokens[i][i2]) === -1) {
                    newRevisionArray.push(compiledTokens[i][i2]);
                }
            }
        }
        // Go through real revision array and show all revisions that are in the new revision array and hidden
        for(i = 1; i < revisionArr.length; i++) {
            if(newRevisionArray.indexOf(revisionArr[i]) !== -1) {
                // Revision in new revision array
                if(Wikiwho.hvhiddenRevisions.indexOf(revisionArr[i]) !== -1) {
                    // Is hidden => show
                    if(animation) {
                        $('.hvrevhead-'+revisionArr[i]).show().animate({'height': '4.5em'}, 500, function() {
                            $(this).css("height", "");
                        });
                        $('.hvtokencolpiece-'+revisionArr[i]).show().animate({'height': '4.5em'}, 500, function() {
                            $(this).css("height", "");
                        });
                    }else{
                        $('.hvrevhead-'+revisionArr[i]).show();
                        $('.hvtokencolpiece-'+revisionArr[i]).show();
                    }

                    // Get index of previous shown revision
                    var previousRevIndex = i - 1;
                    while(Wikiwho.hvhiddenRevisions.indexOf(revisionArr[previousRevIndex]) !== -1) {
                        previousRevIndex--;
                    }

                    // Get index of next shown revision
                    var nextRevIndex = i + 1;
                    while((nextRevIndex < revisionArr.length) && (Wikiwho.hvhiddenRevisions.indexOf(revisionArr[nextRevIndex]) !== -1)) {
                        nextRevIndex++;
                    }

                    // Correct diff of previous revision
                    // Calculate and update new date diff data of previous shown revision
                    $('.hvrevhead-'+revisionArr[previousRevIndex]+' .hvlefttimediff').text(revisionsById[revisionArr[i]].from(revisionsById[revisionArr[previousRevIndex]], true));

                    // Calculate distance in revisions
                    // TODO: Make this more efficient (maybe restructure data sent from API?)
                    var counter = 0;
                    var iterrevid = revisionArr[previousRevIndex];
                    var targetid = revisionArr[i];
                    while(iterrevid !== targetid) {
                        counter++;
                        iterrevid = Wikiwho.revisions[iterrevid][1];  // parent_id
                    }

                    // Update distance in revisions
                    $('.hvrevhead-'+revisionArr[previousRevIndex]+' .hvrighttimediff').text(counter + (counter===1 ? " revision" : " revisions"));

                    // Correct diff of this revision
                    if(nextRevIndex === revisionArr.length) {
                        // Shouldn't show a diff
                        // TODO
                    }else{
                        // Calculate and update new date diff data of this shown revision
                        $('.hvrevhead-'+revisionArr[i]+' .hvlefttimediff').text(revisionsById[revisionArr[nextRevIndex]].from(revisionsById[revisionArr[i]], true));

                        // Calculate distance in revisions
                        // TODO: Make this more efficient (maybe restructure data sent from API?)
                        counter = 0;
                        iterrevid = revisionArr[i];
                        targetid = revisionArr[nextRevIndex];
                        while(iterrevid !== targetid) {
                            counter++;
                            iterrevid = Wikiwho.revisions[iterrevid][1]; // parent_id
                        }

                        // Update distance in revisions
                        $('.hvrevhead-'+revisionArr[i]+' .hvrighttimediff').text(counter + (counter===1 ? " revision" : " revisions"));
                    }

                    // Remove from hvhiddenRevisions array
                    Wikiwho.hvhiddenRevisions.splice(Wikiwho.hvhiddenRevisions.indexOf(revisionArr[i]), 1);
                }
            }
        }
    },

    addSelectionEvents: function() {
        $("html").mouseup(function(e) {
            if (window.getSelection) {
                // Cancel if history or age view is already opened
                if(Wikiwho.historyViewOpen || Wikiwho.ageViewOpen) {
                    return;
                }

                // Cancel if mouse is at open indicator / hist box
                if(Wikiwho.seqHistBox.css("display") !== "none") {
                    var relX = e.pageX - Wikiwho.seqHistBox.offset().left;
                    var relY = e.pageY - Wikiwho.seqHistBox.offset().top;
                    if((relX >= 0) && (relY >= 0) && (relX < Wikiwho.seqHistBox.outerWidth()) && (relY < Wikiwho.seqHistBox.outerHeight())) {
                        return;
                    }
                }

                selectionRange = window.getSelection().getRangeAt(0);

                // Check whether something is selected
                if(!selectionRange.collapsed) {
                    // Set start and end container (should be spans)
                    var firstToken = $(selectionRange.startContainer.parentElement);
                    var lastToken = $(selectionRange.endContainer.parentElement);

                    // Reset some variable
                    Wikiwho.selectionEndTokenId = undefined;

                    // Don't do anything if we can't associate the selection with author-tokens
                    if(!firstToken.hasClass("editor-token")) {
                        var tempFirstToken = $(selectionRange.startContainer.nextElementSibling);
                        if(tempFirstToken.hasClass("editor-token")) {
                            firstToken = tempFirstToken
                        }else{
                            tempFirstToken = firstToken.parent();
                            if(tempFirstToken.hasClass("editor-token")) {
                                firstToken = tempFirstToken;
                            }else{
                                return;
                            }
                        }
                    }
                    if(!lastToken.hasClass("editor-token")) {
                        var tempLastToken = $(selectionRange.endContainer.previousElementSibling);
                        if(tempLastToken.hasClass("editor-token")) {
                            lastToken = tempLastToken
                        }else{
                            tempLastToken = lastToken.parent();
                            if(tempLastToken.hasClass("editor-token")) {
                                lastToken = tempLastToken;
                                for(i = 0; i < 3; i++) {
                                    if(tempLastToken.next().hasClass("editor-token")) {
                                        Wikiwho.selectionEndTokenId = tempLastToken.next().attr("id").slice(6);
                                        break;
                                    }
                                    if(tempLastToken.next().find("span.editor-token").length > 0) {
                                        Wikiwho.selectionEndTokenId = tempLastToken.next().find("span.editor-token").first().attr("id").slice(6);
                                        break;
                                    }
                                    tempLastToken = tempLastToken.parent();
                                }
                            }else{
                                return;
                            }
                        }
                    }


                    // Check whether these start and end tokens are already saved and indicator is shown
                    if(firstToken.is(Wikiwho.seqStartToken) && lastToken.is(Wikiwho.seqEndToken) && (Wikiwho.seqHistBox.css("display") !== "none")) {
                        // Cancel and don't reopen the indicator
                        return;
                    }

                    // Save start and end token
                    Wikiwho.seqStartToken = firstToken;
                    Wikiwho.seqEndToken = lastToken;

                    // Calculate height of marked text part
                    var selectionHeight = Wikiwho.seqEndToken.offset().top + Wikiwho.seqEndToken.outerHeight(false) - Wikiwho.seqStartToken.offset().top;

                    // Calculate optimal history view height
                    var maxviewheight = $(window).height() - (selectionHeight + 20);

                    // Check whether selection is too big and if so, notify the user
                    if((maxviewheight < $(window).height()/5) || (maxviewheight < 150)) {
                        Wikiwho.seqHistBox.addClass("indicator");
                        Wikiwho.seqHistBox.addClass("indicatortoolong");
                        Wikiwho.seqHistBox.css("bottom", "-2em");
                        Wikiwho.seqHistBox.animate({"bottom": "0px"}, 300, function() {});
                        Wikiwho.seqHistBox.show();
                        return;
                    }

                    // Show history view indicator
                    Wikiwho.seqHistBox.addClass("indicator");
                    Wikiwho.seqHistBox.removeClass("indicatortoolong");
                    Wikiwho.seqHistBox.removeClass("indicatoronerev");
                    Wikiwho.seqHistBox.css("bottom", "-2em");
                    Wikiwho.seqHistBox.animate({"bottom": "0px"}, 300, function() {});
                    Wikiwho.seqHistBox.show();
                }else{
                    // Hide history view indicator
                    if(!Wikiwho.historyViewOpen) {
                        Wikiwho.seqHistBox.animate({"bottom": "-2em"}, 300, function() {
                            Wikiwho.seqHistBox.hide();
                            Wikiwho.seqHistBox.css("top", "");
                        });
                    }
                }
            }
        });

        Wikiwho.newcontent.mousedown(function() {

        });
    },

    fillRightPanel: function() {
        // Create list box for authors
        var authorListBox = $("#wikiwhoAuthorList").empty();

        // Add authors to list box
        for (var i = 0; i < Wikiwho.present_editors.length; i++) {
            var author_name = Wikiwho.present_editors[i][0];
            var author_id = Wikiwho.present_editors[i][1];  // class name
            var author_score = Wikiwho.present_editors[i][2];
            // console.log(author_id, author_name, author_score);
            var authentry;

            // Anonymous authors don't have a contrib page
            if(!author_name.startsWith('0|')) {
                authentry = $('<li id="editor-'+author_id+'"><span class="editor-score">'+author_score.toFixed(1)+'%</span></li>').appendTo(authorListBox);
                $('<span><a target="_blank" href="/wiki/Special:Contributions/'+author_name+'"><img src="'+ Wikiwho.wikicolorUrl + 'static/whocolor/images/UserAvatar.svg" class="wwhouserinfoicon"/></a></span>').appendTo(authentry);
                $('<span>'+author_name+'</span>').appendTo(authentry);
            }else{
                authentry = $('<li id="editor-'+author_id+'"><span class="editor-score">'+author_score.toFixed(1)+'%</span><span><img src="'+ Wikiwho.wikicolorUrl + 'static/whocolor/images/UserAvatar.svg" class="wwhouserinfoicon wwhouserinfoiconhidden"/></span><span>'+author_name+'</span></li>').appendTo(authorListBox);
            }

            // Create click handler (wrap in a closure first so the variables are passed correctly)
            (function(author_id, authentry) {
                authentry.mousedown(function(e){ e.preventDefault(); });
                authentry.click(function() {
                    if(typeof Wikiwho.coloredAuthors[author_id] === 'undefined') {
                        // if editor is not selected already
                        if(Wikiwho.tokenColors.length === 0) {
                            alert("You can't select any more editors. Please deselect an editors first to be able to select another one again.");
                            return;
                        }

                        if(Wikiwho.conflictViewOpen) {
                            alert("Conflict view is opened! Please close the conflict view first.");
                            return;
                        } else if(Wikiwho.ageViewOpen) {
                            alert("Age view is opened! Please close the age view first.");
                            return;
                        }

                        //var colorindex = Math.floor(Math.random()*Wikiwho.tokenColors.length);
                        var color = Wikiwho.tokenColors.splice(0, 1)[0];
                        var contrastColor = Wikiwho.getContrastingColor(color);
                        Wikiwho.coloredAuthors[author_id] = color;
                        $("span.token-editor-"+author_id).css({"background-color": color,
                                                               "color": contrastColor[0]}).find("*").css("color", contrastColor[1]);
                        $("div.hvauthorid-"+author_id).css({"background-color": color, "color": contrastColor[0]});
                        authentry.css({"background-color": color,
                                       "color": contrastColor[0]});
                    }else{
                        // if editor is already selected
                        Wikiwho.tokenColors.unshift(Wikiwho.coloredAuthors[author_id]);
                        delete Wikiwho.coloredAuthors[author_id];
                        $("span.token-editor-"+author_id).css({"background-color": "", "color": ""}).find("*").css("color", "");
                        $("div.hvauthorid-"+author_id).css({"background-color": "", "color": ""});
                        authentry.css({"background-color": "", "color": ""});
                    }
                });

                authentry.hover(function(event) {
                    // Mousein event handler

                    // Remove all selection markers
                    $("span.editor-token").removeClass("selected hvselected");
                    $("div.hvrevauthor").removeClass("selected");
                    $("#wikiwhoAuthorList li").removeClass("selected");
                    clearTimeout(Wikiwho.deselectTimeout);

                    // Mark all tokens of this author
                    $("span.token-editor-"+author_id).addClass("selected");
                    $("div.hvauthorid-"+author_id).addClass("selected");
                    $("li#editor-"+author_id).addClass("selected");
                }, function(event) {
                    // Mouseout event handler
                    Wikiwho.deselectTimeout = setTimeout(function(){
                        // Remove all selection markers
                        $("span.editor-token").removeClass("selected hvselected");
                        $("div.hvrevauthor").removeClass("selected");
                        $("#wikiwhoAuthorList li").removeClass("selected");
                    }, 500);
                });
            })(author_id, authentry);
        }
    },

    hoverToken: function(authorid) {
        // Clear deselect timeout
        clearTimeout(Wikiwho.deselectTimeout);

        // Clear "current token" marker
        $(".hvselected").removeClass("hvselected").addClass("selected");

        // Clear hvauthor marker
        $("div.hvrevauthor").removeClass("selected");

        // Determine whether this author is already/still selected
        var selected = $("#wikiwhoAuthorList li.selected");
        if(selected.length >= 1) {
            var selectedAuthId = selected.attr('id').slice(7);
            if(selectedAuthId === authorid) {
                // Already selected, don't do anything else
                return;
            }

            selected.stop( false, true ).stop( false, true ).stop( false, true );
            selected.removeClass("selected");
            $("span.token-editor-"+selectedAuthId).removeClass("selected");
        }

        // Scroll the author list to the position of the current entrys author
        Wikiwho.scrollToShowAuthEntry(authorid);

        // Mark all tokens of this author
        $("span.token-editor-"+authorid).addClass("selected");
        $("div.hvauthorid-"+authorid).addClass("selected");
        $("li#editor-"+authorid).addClass("selected");

        // Flash the author entry
        $("li#editor-"+authorid).delay(300).fadeOut(100).fadeIn(300);
    },

    addTokenEvents: function() {
        var authortokens = $("span.editor-token");

        authortokens.hover(function(event) {
            // Mousein event handler
            var authorid = $(this).attr('class').match(/token-editor-([a-f0-9]+)/)[1];
            var tokenid = $(this).attr('id').slice(6);

            // Call the general hover handler
            Wikiwho.hoverToken(authorid);

            // If history view is open, add red outline to current token
            if((Wikiwho.historyViewOpen) && ($("span#token-age-"+tokenid).length === 1)) {
                // Add outline
                $("span#token-age-"+tokenid).removeClass("selected").addClass("hvselected");

                // Scroll history view to right position if necessary
                $("#wikiwhoseqhistbox .hvtokenbodies").stop(true);
                var tokenleft = $("span#token-age-"+tokenid).parent().position().left;
                var tokenright = tokenleft + $("span#token-age-"+tokenid).parent().outerWidth();
                var scrollpos = $("#wikiwhoseqhistbox .hvtokenbodies").scrollLeft();

                if(tokenleft < 0) {
                    $("#wikiwhoseqhistbox .hvtokenbodies").stop(true).animate({scrollLeft: tokenleft+scrollpos}, 500);
                }else if(tokenright > $("#wikiwhoseqhistbox .hvtokenbodies").width()-2) {
                    $("#wikiwhoseqhistbox .hvtokenbodies").stop(true).animate({scrollLeft: tokenright+scrollpos-$("#wikiwhoseqhistbox .hvtokenbodies").outerWidth()+2}, 500);
                }
            }
        }, function(event) {
            // Mouseout event handler
            Wikiwho.deselectTimeout = setTimeout(function(){
                // Remove all selection markers
                $("span.editor-token").removeClass("selected hvselected");
                $("div.hvrevauthor").removeClass("selected");
                $("#wikiwhoAuthorList li").removeClass("selected");
            }, 500);
        });

        authortokens.click(function() {
            if(Wikiwho.conflictViewOpen) {
                alert("Conflict view is opened! Please close the conflict view first.");
                return;
            } else if(Wikiwho.ageViewOpen) {
                alert("Age view is opened! Please close the age view first.");
                return;
            }
            var editor = $(this).attr('class').match(/token-editor-([a-f0-9]+)/)[1];
            $("li#editor-"+editor).click();
            return false;
        });
    },

    scrollToShowAuthEntry: function(editor) {
        // Scroll target
        var authEntry = $('li#editor-'+editor);

        // Don't try to scroll if there is no target to scroll to
        if(authEntry.length === 0) return;

        // Set a few helper Variables
        var authList = $('#wikiwhorightbar');
        var authListTop = authList.scrollTop();
        var listHeight = authList.height();
        var entryTop = authEntry.position().top;
        var entryHeight = authEntry.height();

        // Determine whether we have to scroll
        if(entryTop < 0) {
            // Entry is too high, scroll up
            authList.stop().animate({
                scrollTop: entryTop + authListTop
            }, 300);
        }else if(entryTop > listHeight - entryHeight) {
            // Entry is too low, scroll down
            authList.stop().animate({
                scrollTop: entryTop + authListTop - listHeight + entryHeight
            }, 300);
        }
    },

    openConflictView: function() {
        // Do nothing - no conflicts (special case)
        if(Wikiwho.biggest_conflict_score === 0) {
            alert('There is no conflict.');
            return;
        }
        // Remove colorization
        $('span.editor-token').css({'background-color': '', 'color': ''}).find("*").css('color', '');
        $("#wikiwhoAuthorListHeader").text('Conflict View');
        $("#ageLimitBox").hide();
        $("#wikiwhoAuthorList").hide();
        // $(".editor-token").unbind('mouseenter mouseleave');
        // $(".editor-token").off('mouseenter mouseleave');
        // Color all tokens
        var conflict_opacity_value = 0;
        for (var i = 0; i < Wikiwho.tokens.length; i++) {
            var conflict_score = Wikiwho.tokens[i][0];
            if (conflict_score !== 0) {
                conflict_opacity_value = conflict_score/Wikiwho.biggest_conflict_score;
                $('span#token-'+i).css({
                    'background-color': 'rgba(255,0,0,'+conflict_opacity_value+')',
                    'color': (conflict_opacity_value >= 0.5) ? 'white' : 'black'
                }).find("*").css("color", (conflict_opacity_value >= 0.5) ? 'white' : 'black');
            }
        }
        // Mark conflict view as open
        Wikiwho.provenanceViewOpen = false;
        Wikiwho.conflictViewOpen = true;
        Wikiwho.ageViewOpen = false;
        $('#provenanceviewbutton').removeClass('provenanceviewbuttonopen');
        $('#conflictviewbutton').addClass("conflictviewopen");
        $('#ageviewbutton').removeClass('ageviewbuttonopen');
    },

    closeConflictView: function() {
        // Remove colorization
        $('span.editor-token').css({'background-color': '', 'color': ''}).find("*").css('color', '');
        $("#wikiwhoAuthorListHeader").text('Editor List');
        $("#wikiwhoAuthorList").show();
        // $(".editor-token").on('mouseenter mouseleave');
        // Recolor tokens
        Object.keys(Wikiwho.coloredAuthors).forEach(function(authorid) {
            var color = Wikiwho.coloredAuthors[authorid];
            var contrastColor = Wikiwho.getContrastingColor(color);
            $("span.token-editor-"+authorid).css({"background-color": color,
                                                  "color": contrastColor[0]}).find("*").css("color", contrastColor[1]);
            $('.hvauthorid-'+authorid).css({
                'background-color': color,
                'color': contrastColor[0]
            });
        });
        // Mark conflict view as closed
        Wikiwho.provenanceViewOpen = true;
        Wikiwho.conflictViewOpen = false;
        $('#provenanceviewbutton').addClass('provenanceviewbuttonopen');
        $('#conflictviewbutton').removeClass("conflictviewopen");
    },

    openAgeView: function() {
        // Remove colorization
        $('span.editor-token').css({'background-color': '', 'color': ''}).find("*").css('color', '');
        $("#wikiwhoAuthorListHeader").text('Age View');
        $("#wikiwhoAuthorList").hide();
        $("#ageLimitBox").show();
        // Color all tokens according to age
        var shade_count = Math.ceil((Wikiwho.ageLimitTo-Wikiwho.ageLimitFrom)/Wikiwho.groupSize);
        var age_days = 0;
        var age_opacity_value = 0;
        for (var i = 0; i < Wikiwho.tokens.length; i++) {
            age_days = Wikiwho.tokens[i][6] / (60 * 60 * 24);
            if (Wikiwho.ageLimitFrom <= age_days && age_days <= Wikiwho.ageLimitTo) {
                age_opacity_value = (1/shade_count) * (shade_count + 1 - Math.ceil((age_days-Wikiwho.ageLimitFrom)/Wikiwho.groupSize));
                $('span#token-'+i).css({'background-color': 'rgba(255,255,0,'+age_opacity_value+')'});
            }
        }
        // Mark age view as open
        Wikiwho.provenanceViewOpen = false;
        Wikiwho.conflictViewOpen = false;
        Wikiwho.ageViewOpen = true;
        $('#provenanceviewbutton').removeClass('provenanceviewbuttonopen');
        $('#conflictviewbutton').removeClass("conflictviewopen");
        $('#ageviewbutton').addClass('ageviewbuttonopen');
        // }
        // else {
        //     alert('No token younger than ' + Wikiwho.ageLimit + ' days.');
        // }
    },

    closeAgeView: function() {
        // Remove colorization
        $('span.editor-token').css({'background-color': '', 'color': ''}).find("*").css('color', '');
        $("#ageLimitBox").hide();
        $("#wikiwhoAuthorListHeader").text('Editor List');
        $("#wikiwhoAuthorList").show();
        // Recolor tokens
        Object.keys(Wikiwho.coloredAuthors).forEach(function(authorid) {
            var color = Wikiwho.coloredAuthors[authorid];
            var contrastColor = Wikiwho.getContrastingColor(color);
            $("span.token-editor-"+authorid).css({"background-color": color,
                                                  "color": contrastColor[0]}).find("*").css("color", contrastColor[1]);
            $('.hvauthorid-'+authorid).css({
                'background-color': color,
                'color': contrastColor[0]
            });
        });
        // Mark age view as closed
        Wikiwho.provenanceViewOpen = true;
        Wikiwho.ageViewOpen = false;
        $('#provenanceviewbutton').addClass('provenanceviewbuttonopen');
        $('#ageviewbutton').removeClass("ageviewbuttonopen");
    },

    // Check whether sth should be done and what (on this specific page)
    pageCheck: function() {
//         return $("li#ca-nstab-main").hasClass("selected") && $("li#ca-view").hasClass("selected")
//                && !Wikiwho.contentAlreadyReplaced && !$('table.diff').length;
        return true;
    },


    // Initialize the Wikiwho Userscript
    initialize: function() {
        if(!Wikiwho.initialized && Wikiwho.pageCheck()) {
            // We're on a web page where we should do something
            Wikiwho.initialized = true;
            //Wikiwho.addStyle();
            Wikiwho.createHTMLElements();
            Wikiwho.getWikiwhoData();
        }
    }
};

// Do not run in frames
// if (window.top !== window.self) {
//     // Do nothing
// }else{
//     // Initialize the script as soon as the content text / page is loaded
//     function waitForMwContent() {
//         if($("#mw-content-text").length > 0) {
//             Wikiwho.initialize();
//         }else{
//             setTimeout(waitForMwContent, 100);
//         }
//     }

//     waitForMwContent();
// }

$(document).ready(function() {
    Wikiwho.initialize();
});

//jQuery.ajax({
//            url: 'http://127.0.0.1:8000/documents/',
//            method: 'GET',
//            // data: data,
//            dataType: "json",
//            success: testDataCallback,
//            error: function() {
//                // Request failed, try again
//                //setTimeout(Wikiwho.getWikiwhoData, 5000);  // 5 seconds
//                return;
//            }
//        })
//
//function testDataCallback(data) {
//    //alert(data)
//
//    console.log(data)
//}
