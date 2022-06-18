(() => {
    const HamoodDiv = `<div id="hamood" style="text-align:center;position:absolute;z-index:999;top:0;bottom:0;left:0;right:0;background-color:#fff;width:auto;height:auto;opacity:1;transition:opacity .5s"><img id="hamoodSplash" style="position:absolute;top:0;bottom:0;left:0;right:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .5s" border="0"> <svg id="hamoodLoading" style="display:none;width:32px;height:32px;position:absolute;bottom:50vh;margin:auto;left:0;right:0" xmlns="http://www.w3.org/2000/svg" version="1" viewBox="0 0 16 16" width="16" height="16"><style>@keyframes rotate{0%{transform:rotate(0)}to{transform:rotate(360deg)}}@keyframes fillunfill{0%{stroke-dashoffset:32.3}50%{stroke-dashoffset:0}to{stroke-dashoffset:-31.9}}@keyframes rot{0%{transform:rotate(0)}to{transform:rotate(-360deg)}}@keyframes colors{0%,to{stroke:#000}}</style><g style="animation-duration:1.568s;animation-iteration-count:infinite;animation-name:rotate;animation-timing-function:linear;transform-origin:50% 50%;width:16px;height:16px"><path fill="none" d="M8 1.125A6.875 6.875 0 1 1 1.125 8" stroke-width="1.5" stroke-linecap="round" style="animation-duration:1333ms,5332ms,5332ms;animation-fill-mode:forwards;animation-iteration-count:infinite,infinite,infinite;animation-name:fillunfill,rot,colors;animation-play-state:running,running,running;animation-timing-function:cubic-bezier(.4,0,.2,1),steps(4),linear;transform-origin:50% 50%" stroke-dasharray="32.4" stroke-dashoffset="32.4"/></g></svg><h4 id="hamoodText" style="position:absolute;bottom:10vh;white-space:nowrap;left:50%;transform:translate(-50%,0);background-color:rgba(0,0,0,.5);color:#fff;border-radius:10px;padding:2vh"></h4><p id="hamoodSkip" style="position:absolute;right:32px;top:32px;background-color:rgba(0,0,0,.5);color:#fff;padding:1vh;font-size:1rem;border-radius:4px">跳过</p></div>`;
    const ratio = screen.availWidth / screen.availHeight;
    let storageData = localStorage.hamood ? JSON.parse(localStorage.hamood) : {};
    const updateStorage = () => {
        localStorage.hamood = JSON.stringify(storageData);
    };
    const sleep = delay => new Promise((resolve) => setTimeout(resolve, delay));
    let picCache;
    const waitToExit = async showTime => {
        const text = document.getElementById("hamoodSkip");
        text.addEventListener("click", () => {
            closeHamood();
        });
        for (; showTime > 0; showTime--) {
            text.innerText = "跳过 " + showTime + "秒";
            await sleep(1000);
        };
        closeHamood();
    };
    const closeHamood = async () => {
        document.getElementById("hamood").style.opacity = 0;
        await sleep(500);
        document.body.removeChild(document.getElementById("hamood"));
        updateStorage();
    };
    const updateSplashAsync = async url => {
        let splash = await (await fetch(url).catch(() => { console.error("Failed to load Hamood data."); })).json().catch(() => { console.error("Failed to load Hamood data."); });
        storageData.cachedSplash = splash;
        storageData.cachedUrl = url;
        let selected;
        storageData.cachedSplash.splash.forEach(pic => {
            if (pic.minRatio < ratio && ratio < pic.maxRatio) {
                storageData.showHistory[pic.name] = storageData.showHistory[pic.name] ? storageData.showHistory[pic.name] : { repeat: 0, dailyRepeat: 0, lastDay: new Date().toLocaleDateString() };
                if (storageData.showHistory[pic.name].repeat < pic.maxRepeat) {
                    selected = pic;
                };
            };
        });
        if (!selected) {
            console.warn("No splash avaliable for Hamood.")
        } else {
            let cacheRequest = await fetch(selected.pic);
            if (cacheRequest.status < 300) {
                picCache.put(selected.pic, cacheRequest.clone());
                console.log("Hamood cached splash.");
            } else {
                console.warn("Splash url returned code " + cacheRequest.status + ". Check your url.");
            };
        }
    };
    window.Hamood = {
        init: async (config, skip) => {
            console.log("Hamood Version:0.1.0");
            let startTime = Date.now();
            if (!storageData.cachedSplash || !storageData.cachedUrl == config.data) {
                let splash = await (await fetch(config.data).catch(() => { console.error("Failed to load Hamood data."); })).json().catch(() => { console.error("Failed to load Hamood data."); });
                storageData.cachedSplash = splash;
                storageData.cachedUrl = config.data;
            } else {
                updateSplashAsync(config.data);
            };
            if ((Date.now() - startTime) > 500) {
                skip = true;
            };
            storageData.showHistory = storageData.showHistory ? storageData.showHistory : {};
            picCache = await caches.open("Hamood");
            let selected;
            storageData.cachedSplash.splash.forEach(pic => {
                if (pic.minRatio < ratio && ratio < pic.maxRatio) {
                    storageData.showHistory[pic.name] = storageData.showHistory[pic.name] ? storageData.showHistory[pic.name] : { repeat: 0, dailyRepeat: 0, lastDay: new Date().toLocaleDateString() };
                    if (storageData.showHistory[pic.name].repeat < pic.maxRepeat) {
                        if (storageData.showHistory[pic.name].lastDay == new Date().toLocaleDateString()) {
                            if (storageData.showHistory[pic.name].dailyRepeat < pic.maxDailyRepeat) {
                                selected = pic;
                            }
                        } else {
                            selected = pic;
                        };
                    };
                };
            })
            if (!selected) {
                console.warn("No splash avaliable for Hamood.")
            } else {
                let picFile = await picCache.match(selected.pic);
                if (!picFile) {
                    if (!skip && config.forceSkipPreload) {
                        document.body.insertAdjacentHTML("beforeend", HamoodDiv);
                        let picDiv = document.getElementById("hamoodSplash");
                        picDiv.src = selected.pic;
                        picDiv.onload = () => {
                            picDiv.style.opacity = 1;
                            document.getElementById("hamoodLoading").style.display = "none";
                            storageData.showHistory[selected.name].repeat++;
                            storageData.showHistory[selected.name].dailyRepeat++;
                            storageData.showHistory[selected.name].lastDay = new Date().toLocaleDateString();
                            waitToExit(selected.showTime);
                        };
                        document.getElementById("hamoodText").innerText = selected.text;
                        if (config.showLoadingTip) {
                            document.getElementById("hamoodLoading").style.display = "block";
                        };
                    } else {
                        skip = true;
                        let cacheRequest = await fetch(selected.pic)
                        if (cacheRequest.status < 300) {
                            picCache.put(selected.pic, cacheRequest.clone());
                        } else {
                            console.warn("Splash url returned code " + cacheRequest.status + ". Check your url.");
                        };
                    };
                };
                //展示开屏
                if (!skip && picFile) {
                    document.body.insertAdjacentHTML("beforeend", HamoodDiv);
                    let picDiv = document.getElementById("hamoodSplash");
                    picDiv.src = URL.createObjectURL(await picFile.blob());
                    picDiv.onload = () => {
                        picDiv.style.opacity = 1;
                        storageData.showHistory[selected.name].repeat++;
                        storageData.showHistory[selected.name].dailyRepeat++;
                        storageData.showHistory[selected.name].lastDay = new Date().toLocaleDateString();
                        waitToExit(selected.showTime);
                    };
                    document.getElementById("hamoodText").innerText = selected.text;
                };
            };
            //保存数据
            updateStorage();
        }
    };
})()