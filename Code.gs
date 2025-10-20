var map = {}, list = {}, tID = {};
var langs = [];
var langv = {};
var employ = {}; 

function myFunction(){
  initializeEmployData();
  initializeTranslators();
  initializeTeachers();
  langVariation();
  meetingMatch();
  saveEmployData();
}

function initializeEmployData() {
  var scriptProperties = PropertiesService.getScriptProperties();
  var employData = scriptProperties.getProperty('employ');
  
  if(employData){
    employ = JSON.parse(employData);
  }
}

function saveEmployData() {
  var scriptProperties = PropertiesService.getScriptProperties();
  var employData = JSON.stringify(employ);
  scriptProperties.setProperty('employ', employData);
}

function meetingMatch(){ 
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('TranslatorsList'); 
  var cals = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CalendarList').getDataRange().getValues();
  var st = new Date((new Date()).getTime() - 1800000), ed = new Date('Jan 01,9999 00:00:00');
  checkCancellation();
  checkDeletedEvent();

  for(var i = 1; i < cals.length; i++){
    var id = cals[i][1];
    console.log(id);
    var calendar = CalendarApp.getCalendarById(id);
    var events = calendar.getEvents(st, ed);
    for(var j = 0; j < events.length; j++){ 
      Unemploy(events[j], true, calendar, sheet);
    }

    var inMeeting = false;
    for(var j = 0; j < events.length; j++){
      if(events[j].getId() in employ){
        inMeeting = true;
      }
    }
    if(inMeeting){
      updateTimestamp(events, calendar, sheet);
      continue;
    }

    for(var j = 0; j < events.length; j++){
      inMeeting = Employ(events[j], calendar, sheet);
      if(inMeeting) break;
    }
  }
}

function Employ(event, calendar, sheet){
  var now = new Date();
  var time = now.valueOf();
  var start = event.getStartTime().valueOf(), end = event.getEndTime().valueOf();
  var meetinglist = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('MeetingList'); 
  if(getStatue(event)) return false;
  if(start >= time){
    if(event.getId() in employ) return true; 
    if(start - time >= 1800000) return false;
    for(const cur of langs){  
      if(event.getDescription().toLowerCase().indexOf(cur) > -1){  //rewrite for string-matching
        var lang = langv[cur];
        if(map[lang].length() <= 0) continue;
        employ[event.getId()] = map[lang].pop();  
        var translator = employ[event.getId()];
        sheet.getRange(translator.id, 4).setValue('Unavailable');
        sheet.getRange(translator.id, 6).setValue(calendar.getId());
        sheet.getRange(translator.id, 7).setValue(event.getId());
        meetinglist.getRange(tID[calendar.getId()], 1).setValue(calendar.getId());
        meetinglist.getRange(tID[calendar.getId()], 3).setValue(translator.email);
        meetinglist.getRange(tID[calendar.getId()], 5).setValue(event.getStartTime().toTimeString());
        meetinglist.getRange(tID[calendar.getId()], 7).setValue(event.getEndTime().toTimeString());
        return true;
      }
    }
  }
  return false;
}

function Unemploy(event, finish, calendar, sheet){
  var now = new Date();
  var time = now.valueOf();
  var start = event.getStartTime().valueOf(), end = event.getEndTime().valueOf();
  var meetinglist = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('MeetingList'); 

  if(time >= end || !finish){ 
    if(event.getId() in employ){  
      var translator = employ[event.getId()];  
      var name = translator.name, email = translator.email, language = translator.language;
      var frequency = translator.frequency, id = translator.id;

      delete employ[event.getId()];  
      sheet.getRange(translator.id, 4).setValue('Available');
      sheet.getRange(translator.id, 5).setValue(finish ? frequency + 1 : frequency);
      sheet.getRange(translator.id, 6).setValue(" ");
      sheet.getRange(translator.id, 7).setValue(" ");
      meetinglist.getRange(tID[calendar.getId()], 1).setValue(" ");
      meetinglist.getRange(tID[calendar.getId()], 3).setValue(" ");
      meetinglist.getRange(tID[calendar.getId()], 5).setValue(" ");
      meetinglist.getRange(tID[calendar.getId()], 7).setValue(" ");
      map[language].push(new Translator(name, email, language, finish ? frequency + 1 : frequency, id));  
    }
  }
}

function updateTimestamp(events, calendar, sheet){
  var time = (new Date()).valueOf();
  meetings = {};

  var first;
  for(var i = 0; i < events.length; i++){
    var event = events[i];
    var start = event.getStartTime().valueOf(), end = event.getEndTime().valueOf();

    if(start >= time && first == null){
      first = event;
    }
    if((event.getId() in employ) && first != null){
      if(event !== first){
        Unemploy(event, false,  calendar, sheet);
        Employ(first, calendar, sheet);
      }
    }
  }
}

function initializeTranslators(){
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('TranslatorsList'); //get translators' data
  var data = sheet.getDataRange().getValues();

  for(var i = 1; i < data.length; i++){
    var language = data[i][0].toLowerCase();
    if(!langs.includes(language)){
      langs.push(language);
    }
    map[language] = new PriorityQueue(compareByPriority); //initialize the map by languages
  }

  for(var i = 1; i < data.length; i++){ //add translators to a specific language
    var language = data[i][0].toLowerCase(), translator = data[i][1], email = data[i][2], frequency = data[i][4];
    if(data[i][3].includes("Available")){
      var flag = false;
      for(const t in map[language]){
        if(t.email === email){
          flag = true;
        }
      }
      if(!flag){
        map[language].push(new Translator(translator, email, language, frequency, i + 1));
      }
    }
  }
}

function initializeTeachers(){
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CalendarList'); //get translators' data
  var data = sheet.getDataRange().getValues();
  for(var i = 1; i < data.length; i++){
    tID[data[i][1]] = data[i][0] + 1;
  }
}

function checkDeletedEvent(){
  var spr = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('TranslatorsList');
  var meetinglist = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('MeetingList'); 
  var st = new Date((new Date()).getTime() - 1800000), ed = new Date('Jan 01,9999 00:00:00');
  var sheet = spr.getDataRange().getValues(); 

  for(var i = 1; i < sheet.length; i++){
    if(sheet[i][3].includes("Unavailable")){
      var cal = CalendarApp.getCalendarById(sheet[i][5]);
      var isDeleted = true;
      var id = sheet[i][6];
      var event;
      var del;
      
      var events = cal.getEvents(st, ed);
      for(var j = 0; j < events.length; j++){
        if(events[j].getId() === id){
          isDeleted = false;
          break;
        }
      }
      if(isDeleted){
        for(var e in employ){
          var cur = employ[e];
          var email = cur.email;
          if(email === sheet[i][2]){
            spr.getRange(cur.id, 4).setValue('Available');
            spr.getRange(cur.id, 5).setValue(cur.frequency);
            spr.getRange(cur.id, 6).setValue(" ");
            spr.getRange(cur.id, 7).setValue(" ");
            meetinglist.getRange(tID[cal.getId()], 1).setValue(" ");
            meetinglist.getRange(tID[cal.getId()], 3).setValue(" ");
            meetinglist.getRange(tID[cal.getId()], 5).setValue(" ");
            meetinglist.getRange(tID[cal.getId()], 7).setValue(" ");
            map[cur.language].push(new Translator(cur.name, cur.email, cur.language, cur.frequency, cur.id));  
            break;
          }
        }
        try{
          delete employ[e];
        }
        catch{

        }
      }
    }
  }
}

function checkCancellation(){
  var cals = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CalendarList').getDataRange().getValues();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('TranslatorsList'); 
  var st = new Date((new Date()).getTime() - 1800000), ed = new Date('Jan 01,9999 00:00:00');

  for(var i = 1; i < cals.length; i++){
    var id = cals[i][1];
    var calendar = CalendarApp.getCalendarById(id);
    var events = calendar.getEvents(st, ed);

    for(var j = 0; j < events.length; j++){
      var event = events[j];
      if(getStatue(event)){
        Unemploy(event, false, sheet);
      }
    }
  }
}

function getStatue(event){
  var members = event.getGuestList();
  if(members == null) return false;
  for(var k = 0; k < members.length; k++){
    if(members[k].getGuestStatus() == "NO"){
      return true;
    }
  }
  return false;
}

function langVariation(){
  langv["中文"] = langv["汉语"] = langv["chinese"] = "chinese";
  langv["한국어"] = langv["한국"] = langv["korean"] = "korean";
  langv["แบบไทย"] = langv["คนไทย"] = langv["ภาษาไทย"] = langv["ชาวไทย"] = langv["thai"] =  "thai";

  langs.push("中文");
  langs.push("汉语");
  langs.push("한국어");
  langs.push("한국");
  langs.push("แบบไทย");
  langs.push("คนไทย");
  langs.push("ภาษาไทย");
  langs.push("ชาวไทย");
}

class Translator{ //translator class
  constructor(name, email, language, frequency, id){
    this.name = name;
    this.email = email;
    this.language = language;
    this.frequency = frequency;
    this.id = id;
  }
}

function compareByPriority(a, b){ 
  return b.frequency - a.frequency;
}
 
class PriorityQueue{ 
  constructor(compare){
    if(typeof compare !=='function'){
      throw new Error('compare function required!');
    }
    this.data = [];
    this.compare = compare;
  }

  search(target){
    let low = 0, high = this.data.length;
    while(low < high){
      let mid = low + ((high - low) >> 1);
      if(this.compare(this.data[mid], target) > 0){
        high = mid;
      }
      else{
        low = mid + 1;
      }
    }
    return low;
  }
 
  push(elem){
    let index = this.search(elem);
    this.data.splice(index, 0, elem);
    return this.data.length;
  }
  
  pop(){
    return this.data.pop();
  }
  
  peek(){
    return this.data[this.data.length - 1];
  }

  length(){
    return this.data.length;
  }
}
