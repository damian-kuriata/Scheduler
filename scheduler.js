import Phrase from "language_phrase";

/* Processes phrases that should be reviewed once again. */
export default class Scheduler {
  static localStorageKey = "learner_scheduler";

  constructor (phrasesCheckIntervalMillis=10000, remindCallback=null, disposeAfterRemind=true) {
      // When a function has been passed, use it.
      if (remindCallback instanceof Function) {
        // After a specified interval of (milli)seconds call provided callback.
        setInterval(() => {
          const toRemind = this.getPhrasesToRemind(false, true);
          remindCallback(toRemind);
        }, phrasesCheckIntervalMillis);
      }
      // This method could be used as callback function, so this would not
      // be visible.
      this.getPhrasesToRemind = this.getPhrasesToRemind.bind(this);
      this.#initStorage({
        millisToRemindDefault: null,
        phrases: []
      });
  }

  setMillisToRemindDefaut (val) {
    if (val <= 0) {
      throw new Error("Only non negative value allowed.");
    }

    // Data is guaranted to exist.
    let data = objFromStorage(Scheduler.localStorageKey);
    data["millisToRemindDefault"] = val;

    saveToStorage(Scheduler.localStorageKey, data);
  }

  #initStorage (data) {
    if (!objFromStorage(Scheduler.localStorageKey)) {
      saveToStorage(Scheduler.localStorageKey, data);
    }
  }

  addNewPhrase (id, millisToRemind=null) {
    let now = Date.now();
    const currentStorageData = objFromStorage(Scheduler.localStorageKey);
    millisToRemind =
      millisToRemind ?? currentStorageData["millisToRemindDefault"];

    if (!millisToRemind) {
      console.log("Error: millsToRemind not defined.Exiting.");
      return;
    }
    const entry = {
      phraseid: id,
      creationDateNow: now,
      millisToRemind: millisToRemind
    };
    let currentPhrases = Phrase.loadFromStorage();
    let foundIndex = currentPhrases.findIndex(ph => ph.id === id);
    if (foundIndex === -1) {
      throw new Error("Phrase does not longer exist");
    }
    currentStorageData.phrases.push(entry);
    saveToStorage(Scheduler.localStorageKey, currentStorageData);
  }

  getPhrasesToRemind (onlyOne=false, dispose=true, relativeDate=Date.now()) {
    let currentStorageData = objFromStorage(Scheduler.localStorageKey);
    let phrases = currentStorageData["phrases"];
    let phrasesToRemind = [];
    const learnerPhrases = Phrase.loadFromStorage();
    const stillExists = (phrase) =>
      learnerPhrases.findIndex(phrase_ => phrase_.id === phrase.id) !== -1;

    phrases.forEach((ph, idx) =>  {
      // Make sure that phrase still exists in main storage.
      if (!stillExists(ph)) {
        return;
      }
      if (relativeDate >= ph.creationDateNow + ph.millisToRemind) {
        phrasesToRemind.push(ph);
        if (dispose) {
          phrases.splice(idx, 1);
        }
      }
    });
    if (dispose) {
      // Dispose from storage all phrases that have been read.
      currentStorageData.phrases = phrases;
      saveToStorage(Scheduler.localStorageKey, currentStorageData);
    }

    return onlyOne? phrasesToRemind.at(-1) : phrasesToRemind;
  }

  deletePhrase (id) {
    let storageEntry = objFromStorage(Scheduler.localStorageKey);
    let foundId =
      storageEntry["phrases"].findIndex((ph, idx) => ph.id === id);
    if (!foundId) {
      throw new Error("Phrase not found");
    }
    storageEntry["phrases"].splice(foundId, 1);
    saveToStorage(Scheduler.localStorageKey, storageEntry);
  }
}

function objFromStorage (key, fallbackObj=null) {
  const item = localStorage.getItem(key);
  return item? JSON.parse(item) : fallbackObj;
}

function saveToStorage (key, obj) {
  localStorage.setItem(key, JSON.stringify(obj));
}
