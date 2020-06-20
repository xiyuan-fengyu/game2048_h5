
type UiConfig = {
    perBoxSize: number,
    gap: number,
    borderRadius: number,
    backgroundColor: string,
    backgroundBoxColor: string
}

class BoxUtil {

    private static nums = {
        "2": {
            "color": "#776e65",
            "backgroundColor": "#eee4da",
            "fontSize": 65
        },
        "4": {
            "color": "#776e65",
            "backgroundColor": "#ede0c8",
            "fontSize": 65
        },
        "8": {
            "color": "#f9f6f2",
            "backgroundColor": "#f2b179",
            "fontSize": 55
        },
        "16": {
            "color": "#f9f6f2",
            "backgroundColor": "#f59563",
            "fontSize": 55
        },
        "32": {
            "color": "#f9f6f2",
            "backgroundColor": "#f67c5f",
            "fontSize": 55
        },
        "64": {
            "color": "#f9f6f2",
            "backgroundColor": "#f65e3b",
            "fontSize": 55
        },
        "128": {
            "color": "#f9f6f2",
            "backgroundColor": "#edcf72",
            "fontSize": 45
        },
        "256": {
            "color": "#f9f6f2",
            "backgroundColor": "#edcc61",
            "fontSize": 45
        },
        "512": {
            "color": "#f9f6f2",
            "backgroundColor": "#edc850",
            "fontSize": 45
        },
        "1024": {
            "color": "#f9f6f2",
            "backgroundColor": "#abe358",
            "fontSize": 35
        },
        "2048": {
            "color": "#f9f6f2",
            "backgroundColor": "#4dd9cf",
            "fontSize": 35
        },
        "4096": {
            "color": "#f9f6f2",
            "backgroundColor": "#a283f9",
            "fontSize": 35
        },
        "8192": {
            "color": "#f9f6f2",
            "backgroundColor": "#f98383",
            "fontSize": 35
        }
    };

    static createBackgroundBox(
        left: number,
        top: number,
        size: number,
        borderRadius: number,
        color: string
    ) {
        return $(`
            <div style="
                position: absolute;
                left: ${left}px;
                top: ${top}px;
                width: ${size}px;
                height: ${size}px;
                border-radius: ${borderRadius}px;
                background-color: ${color};
                z-index: 0;
            "></div>
        `);
    }

    static createNumBox(
        num: number,
        col: number,
        row: number,
        size: number,
        borderRadius: number,
        gap: number
    ) {
        const numInfo = this.nums["" + num];
        return $(`
            <div class="numBox" style="
                position: absolute;
                left: ${gap + (gap + size) * col}px;
                top: ${gap + (gap + size) * row}px;
                width: ${size}px;
                height: ${size}px;
                border-radius: ${borderRadius}px;
                color: ${numInfo.color};
                font-size: ${numInfo.fontSize}px;
                line-height: ${size}px;
                text-align: center;
                background-color: ${numInfo.backgroundColor};
                z-index: 1;
            ">${num}</div>
        `);
    }

}

class NumBox {

    private container: JQuery<HTMLElement>;

    num: number;

    box: JQuery<HTMLElement>;

    col: number;

    row: number;

    private size: number;

    private borderRadius: number;

    private  gap: number;

    isMerged: boolean;

    constructor(
        container: JQuery<HTMLElement>,
        num: number,
        col: number,
        row: number,
        size: number,
        borderRadius: number,
        gap: number
    ) {
        this.container = container;
        this.num = num;
        this.col = col;
        this.row = row;
        this.size = size;
        this.borderRadius = borderRadius;
        this.gap = gap;
        this.refresh();
    }

    refresh() {
        if (this.box) {
            this.box.remove();
        }
        this.box = BoxUtil.createNumBox(this.num, this.col, this.row, this.size, this.borderRadius, this.gap);
        this.box.appendTo(this.container);
    }

    async moveTo(newCol: number, newRow: number) {
        const hMovDis = (newCol - this.col) * (this.size + this.gap);
        const vMovDis = (newRow - this.row) * (this.size + this.gap);
        if (hMovDis + vMovDis != 0) {
            this.col = newCol;
            this.row = newRow;
            return new Promise<void>(resolve => {
               const moveTime = (Math.abs(hMovDis + vMovDis) / (this.size + this.gap)) * 80;
               this.box.animate({
                   left: (this.box[0].offsetLeft + hMovDis) + "px",
                   top: (this.box[0].offsetTop + vMovDis) + "px",
               }, moveTime, "easeInOutCubic", resolve);
            });
        }
    }

    private destroy() {
        this.box.fadeOut(() => {
           this.box.remove();
        });
    }

    async mergeTo(otherBox: NumBox) {
        this.box.css("z-index", 2);
        await this.moveTo(otherBox.col, otherBox.row);
        otherBox.num *= 2;
        otherBox.refresh();
        this.destroy();
    }

}

class Game2048 {

    private uiConfig: UiConfig;

    private container: JQuery<HTMLElement>;

    private scoreSpan: JQuery<HTMLElement>;

    private mainPanel: JQuery<HTMLElement>;

    private numBoxes: NumBox[] = new Array(16).fill(null);

    private score: number;

    private isMerging: boolean = false;

    private isGameOver: boolean = false;

    constructor(container: string, config: UiConfig = {
        perBoxSize: 100,
        gap: 4,
        borderRadius: 4,
        backgroundColor: "#bbada0",
        backgroundBoxColor: "rgba(238, 228, 218, 0.35)"
    }) {
        this.container = $(container);
        if (!this.container.length) {
            throw new Error(`container(${container}) not found`);
        }

        this.uiConfig = config;
        this.initUi();
        this.bindKeys();
        this.newGame();
    }

    private initUi() {
        const width = this.uiConfig.perBoxSize * 4 + this.uiConfig.gap * 5;
        this.container.css("width", width);

        const uiPanel = $(`
            <div class="uiPanel" style="position: relative; display: inline-block; width: 100%; color: #666; line-height: 32px">
                <div style="float: left">score: <span class="scoreSpan">0</span></div>
                <div class="newGameBtn" style="float: right; cursor: pointer">New Game</div> 
            </div>
        `);
        this.container.append(uiPanel);
        this.scoreSpan = uiPanel.find(".scoreSpan");
        uiPanel.find(".newGameBtn").on("click", event => this.newGame());

        this.mainPanel = $(`
            <div class="mainPanel" style="position: relative; width: ${width}px; height: ${width}px"></div>
        `);
        this.container.append(this.mainPanel);

        this.mainPanel.append(BoxUtil.createBackgroundBox(0, 0, width, this.uiConfig.borderRadius, this.uiConfig.backgroundColor));
        for (let i = 0; i < 16; i++) {
            this.mainPanel.append(BoxUtil.createBackgroundBox(
                (this.uiConfig.perBoxSize + this.uiConfig.gap) * (i % 4) + this.uiConfig.gap,
                (this.uiConfig.perBoxSize + this.uiConfig.gap) * Math.floor(i / 4) + this.uiConfig.gap,
                this.uiConfig.perBoxSize, this.uiConfig.borderRadius, this.uiConfig.backgroundBoxColor));
        }

    }

    private bindKeys() {
        const mergeQueue = [];
        const addMerge = merge => {
            if (mergeQueue.length < 2) {
                mergeQueue.push(merge);
            }
        };
        (async () => {
            while (true) {
                if (mergeQueue.length) {
                    await this[mergeQueue.splice(0, 1)[0]]();
                }
                else {
                    await new Promise(resolve => setTimeout(resolve, 1000 / 60));
                }
            }
        })();

        document.addEventListener("keyup", event => {
            switch (event.code) {
                case "ArrowLeft":
                    addMerge("leftMerge");
                    break;
                case "ArrowRight":
                    addMerge("rightMerge");
                    break;
                case "ArrowUp":
                    addMerge("upMerge");
                    break;
                case "ArrowDown":
                    addMerge("downMerge");
                    break;
            }
        });
    }

    private newGame() {
        this.mainPanel.find(".numBox").remove();
        this.numBoxes.fill(null);
        this.score = 0;
        this.isMerging = false;
        this.isGameOver = false;

        this.addNewNumBox(2);
    }

    private addNewNumBox(size: number) {
        const emptyPosArr = this.getRandomEmptyGrids(size);
        for (let index of emptyPosArr) {
            const num = Math.random() < 0.8 ? 2 : 4;
            this.numBoxes[index] = new NumBox(this.mainPanel, num,
                index % 4, Math.floor(index / 4), this.uiConfig.perBoxSize, this.uiConfig.borderRadius, this.uiConfig.gap);
            this.score += num;
        }
        this.scoreSpan.text("" + this.score);
    }

    private getRandomEmptyGrids(size: number): Array<number> {
        const emptyPosArr = [];
        this.numBoxes.forEach((item, index) => {
           if (!item) {
               emptyPosArr.push(index);
           }
        });

        const res = [];
        while (res.length < size && emptyPosArr.length > 0) {
            let randomI = Math.floor(Math.random() * emptyPosArr.length);
            res.push(emptyPosArr.splice(randomI, 1)[0]);
        }
        return res;
    }

    private leftMerge() {
        return this.merge([0, 4, 8, 12], 1);
    }

    private rightMerge() {
        return this.merge([3, 7, 11, 15], -1);
    }

    private upMerge() {
        return this.merge([0, 1, 2, 3], 4);
    }

    private downMerge() {
        return this.merge([12, 13, 14, 15], -4);
    }

    // [0, 1, 2, 3] up
    // [12, 13, 14, 15] down nextDelta=-4
    private async merge(startIndexes: number[], nextDelta: number) {
        if (this.isGameOver || this.isMerging) {
            return;
        }
        this.isMerging = true;

        let addNew = false;
        const promises = [];

        this.numBoxes.forEach(item => item && (item.isMerged = false));

        for (let startIndex of startIndexes) {
            for (let i = 1; i < 4; i++) {
                const curIndex = startIndex + i * nextDelta;
                const curBox = this.numBoxes[curIndex];
                if (curBox) {
                    const reachableBox = this.findReachableBox(curIndex, -nextDelta, startIndex);
                    if (reachableBox) {
                        addNew = true;
                        if (reachableBox.box) {
                            this.numBoxes[curIndex] = null;
                            reachableBox.box.isMerged = true;
                            promises.push(curBox.mergeTo(reachableBox.box));
                        }
                        else {
                            this.numBoxes[curIndex] = null;
                            this.numBoxes[reachableBox.index] = curBox;
                            promises.push(curBox.moveTo(reachableBox.index % 4, Math.floor(reachableBox.index / 4)));
                        }
                    }
                }
            }
        }

        await Promise.all(promises);

        if (addNew) {
            this.addNewNumBox(1);
        }

        if ((this.isGameOver = this.checkGameOver())) {
            setTimeout(() => {
                alert("Game Over!");
            }, 500);
        }

        this.isMerging = false;
    }

    private findReachableBox(curIndex: number, nextDelta: number, endIndex: number) {
        let reachableInfo = null;
        const curNumBox = this.numBoxes[curIndex];
        for (let i = 1; i <= 3; i++) {
            let otherIndex = curIndex + nextDelta * i;
            const otherBox = this.numBoxes[otherIndex];
            if (!otherBox) {
                reachableInfo = {
                    index: otherIndex,
                    box: null
                };
            }
            else if (!otherBox.isMerged && curNumBox.num == otherBox.num) {
                reachableInfo = {
                    index: otherIndex,
                    box: otherBox
                };
            }
            else {
                break;
            }

            if (otherIndex == endIndex) {
                break;
            }
        }
        return reachableInfo;
    }

    private checkGameOver() {
        for (let i = 0; i < 16; i++) {
            let curBox = this.numBoxes[i];
            if (curBox == null) {
                return false;
            }
            else {
                if (i % 4 < 3) {
                    const  rightNumBox = this.numBoxes[i + 1];
                    if (rightNumBox == null || curBox.num == rightNumBox.num) {
                        return false;
                    }
                }

                if (i / 4 < 3) {
                    const downNumBox = this.numBoxes[i + 4];
                    if (downNumBox == null || curBox.num == downNumBox.num) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

}
