const barContainer = document.getElementById("barContainer");

const randomizeBtn = document.getElementById("randomize");
const sortBtn = document.getElementById("sort");
const selectionMenu = document.getElementById("algorithm");
const caption = document.getElementById("caption");

const comparisonCount = document.getElementById("comparisonCount");
const swapCount = document.getElementById("swapCount");
const timer = document.getElementById("timer");
const sortingAlgorithms = document.querySelectorAll('[name="algorithm"]');

let barContainerWidth = barContainer.offsetWidth;
let barContainerHeight = barContainer.offsetHeight;
let slopeOffset = 20;
let barWidth = 10;
let randomizeIterations = 1;

let animationDelta = 3;
let randomizeDelta = 20;
let flushingDelta = 10;
let captionDelta = 2000;

let barHeightMin = slopeOffset;
let barHeightMax = barContainerHeight - slopeOffset;


let barCountMax = barContainerWidth / barWidth;
let barCount = barCountMax;

let isRandomizing = false;
let isSorting = false;
let isFlushing = false;
let isInterrupted = false;

let startSortTime = 0;


let states = {
  inactive: "inactive",
  shifting: "shifting",
  comparing: "comparing",
  swapping: "swapping",
  flushing: "flushing",
  queuing: "queuing"
}

store = (name, value) => {
  localStorage.setItem(name, value);
}

retrieveAlgorithm = () => {
  let selection = localStorage.getItem("sortingAlgorithm");
  sortingAlgorithms.forEach(sortingAlgorithm => {
    if (sortingAlgorithm.value === selection) {
      sortingAlgorithm.setAttribute("selected", "selected");
      return;
    }
  })
}

getValue = (item) => {
  return parseInt(item.getAttribute("value"));
}

extractRandom = (list) => {
  let randomIndex = Math.floor(Math.random() * list.length);
  let randomItem = list[randomIndex];
  list.splice(randomIndex, 1);
  return randomItem;
}

setState = ([...bars], newState) => {
  bars.forEach(bar => {
    bar.setAttribute("state", newState);
  })
}

flush = async (bars) => {
  for await (bar of bars) {
    await sleep(flushingDelta);
    setState([bar], states.flushing)
  }
}

isSorted = (barList) => {
  for (let i = 0; i < barCount - 1; i++) {
    let current = getValue(barList[i]);
    let next = getValue(barList[i + 1]);
    if (current > next) {
      return false;
    }
  }
  return true;
}

clean = (barList) => {
  setState(barList, "inactive");
}

sleep = async (time = animationDelta, multiplier = 1) => {
  return new Promise(resolve => setTimeout(resolve, multiplier * time));
}

halt = () => {
  throw new Error("Don't mind, just debugging...");
}

refresh = ([...bars]) => {
  barContainerWidth = barContainer.offsetWidth;
  let newBarWidth = barContainerWidth / barCount;
  bars.forEach(bar => {
    bar.style.width = newBarWidth + "px";
    bar.style.fontSize = Math.max(Math.min(newBarWidth - 3, 14), 4) + "px";
  });
}

generateBar = (i = 0) => {
  let bar = document.createElement("div");
  bar.classList.add("bar");
  bar.setAttribute("state", states.inactive);
  bar.setAttribute("value", i);
  bar.innerHTML = i;
  bar.style.width = barWidth + "px";
  bar.style.height = i * (barHeightMax - barHeightMin) / barCount + barHeightMin + "px";
  bar.style.fontSize = Math.max(Math.min(barWidth - 3, 14), 4) + "px";
  return bar;
}

generateBarList = () => {
  barContainer.innerHTML = "";
  for (let i = 0; i < barCount; i++) {
    let bar = generateBar(i);
    barContainer.appendChild(bar);
  }
  let bars = barContainer.getElementsByClassName("bar");
  return bars;
}

preRandomizeEvents = () => {};

randomize = async (bars) => {
  if (isRandomizing || isSorting) return;
  isRandomizing = true;
  comparisonCount.style.fontWeight = "500";
  swapCount.style.fontWeight = "500";
  timer.style.fontWeight = "500";
  caption.innerHTML = "Randomizing...";
  clean(bars);
  resetData();
  let iterationList = [];
  for (let i = 0; i < randomizeIterations; i++) {
    setState(bars, "queuing");
    for (let n = 0; n < barCount; n++) {
      iterationList.push(n);
    }
    for (let j = 0; j < barCount; j++) {
      if (isInterrupted) {
        isRandomizing = false;
        isInterrupted = false;
        return;
      };
      let extractedValue = extractRandom(iterationList);
      let bar = document.querySelector(`[value="${extractedValue}"]`);
      setState([bar], "shifting");
      await sleep(randomizeDelta);
      barContainer.removeChild(bar);
      setState([bar], "inactive");
      barContainer.appendChild(bar);
    }
    await sleep(randomizeDelta, 2);
  }
  isRandomizing = false;
  caption.innerHTML = ""
}

updateTimer = () => {
  let currentTime = new Date().getTime();
  let elapsedMilliseconds = (currentTime - startSortTime).toString();
  let decimalIndex = elapsedMilliseconds.length - 3;
  let integerDigits = elapsedMilliseconds >= 1 ? elapsedMilliseconds.slice(0, decimalIndex) : "0";
  let decimalDigits = elapsedMilliseconds.slice(decimalIndex, elapsedMilliseconds.length - 1);
  let elapsedTime = integerDigits + "," + decimalDigits + "s";
  timer.innerHTML = elapsedTime;
}

isGreater = async (listItemA, listItemB) => {
  setState([listItemA, listItemB], states.comparing);
  await sleep(animationDelta);
  let result = getValue(listItemA) > getValue(listItemB);
  comparisonCount.innerHTML = parseInt(comparisonCount.innerHTML) + 1; 
  setState([listItemA, listItemB], states.inactive);
  return result;
}

swap = async (list, i, j) => {
  [i, j] = [Math.min(i, j), Math.max(i, j)];
  let barList = barContainer.childNodes;
  setState([list[i]], states.swapping);
  let tempDiv = generateBar();
  barContainer.insertBefore(tempDiv, barList[j].nextSibling);
  barContainer.insertBefore(barList[j], barList[i].nextSibling);
  barContainer.insertBefore(barList[i], tempDiv);
  tempDiv.remove();
  await sleep(animationDelta);
  swapCount.innerHTML = parseInt(swapCount.innerHTML) + 1;
  setState([list[i], list[j]], states.inactive);
}

set = async (listItemA, listItemB) => {
  setState([listItemA, listItemB], states.shifting);
  let tempDiv = generateBar();
  barContainer.insertBefore(tempDiv, listItemA.nextSibling);
  barContainer.insertBefore(listItemA, listItemB.nextSibling);
  barContainer.insertBefore(listItemB, tempDiv.nextSibling);
  tempDiv.remove();
  await sleep(animationDelta);
  swapCount.innerHTML = parseInt(swapCount.innerHTML) + 1;
  setState([listItemA, listItemB], states.inactive);

}

bubbleSort = async (bars) => {
  for (let i = 0; i < bars.length - 2; i++) {
    for (let j = 0; j < bars.length - i - 1; j++) {
      if (await isGreater(bars[j], bars[j + 1])) {
        await swap(bars, j, j + 1);
      }
    }
  }
}

insertionSort = async (bars) => {
  for (let i = 1; i < bars.length; i++) {
    let key = bars[i];
    let j = i - 1;
    while (j >= 0 && getValue(bars[j]) > getValue(key)) {
      await set(bars[j + 1], bars[j]);
      j--;
    }
    await set(bars[j + 1], key);
  }
}

mergeSort = () => {}

resetData = () => {
  comparisonCount.innerHTML = 0;
  swapCount.innerHTML = 0;
  timer.innerHTML = 0;
}

preSortingEvents = () => {}

postSortingEvents = async (bars) => {
  updateTimer();
  comparisonCount.style.fontWeight = "bold";
  swapCount.style.fontWeight = "bold";
  timer.style.fontWeight = "bold";
  caption.innerHTML = "Sorted!";
  await flush(bars);
  await sleep(captionDelta);
  caption.innerHTML = "Wanna try again?";
}

sort = async (bars) => {
  if (isRandomizing || isSorting) return;
  if (isSorted(bars)) {
    caption.innerHTML = "Already Sorted!";
    return;
  }
  isSorting = true;
  clean(bars);
  caption.innerHTML = "Sorting...";
  startSortTime = new Date().getTime();
  timer.innerHTML = "estimating...";
  let sortingAlgorithm = selectionMenu.value;
  await eval(sortingAlgorithm)(bars);
  await postSortingEvents(bars);
  isSorting = false;
}

window.addEventListener("load", () => console.log("window loaded!"))
randomizeBtn.addEventListener("click", () => {randomize(barList)});
sortBtn.addEventListener("click", () => {sort(barList)});
window.addEventListener("resize", () => {refresh(barList)});
selectionMenu.addEventListener("change", () => {store("sortingAlgorithm", selectionMenu.value)});


init = async () => {
  console.clear();
  resetData();
  retrieveAlgorithm();
  barList = generateBarList();

  console.log(sortingAlgorithms);
}

init();

insertionsort = (list) => {
  for (let i = 1; i < list.length; i++) {
    let key = list[i];
    let j = i - 1;
    while (j >= 0 && list[j] > key) {
      list[j + 1] = list[j];
      j--;
    }
    list[j + 1] = key;
  }
  return list
}