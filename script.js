class Flipboard {
    constructor(numCols, numRows, padSize) {
        const container = document.createElement('div');
        container.style.display = 'grid';

        container.style.gridTemplateColumns = 'repeat(' + numCols + ', min-content)';
        container.style.columnGap = '5px';
        container.style.rowGap = '5px';

        const numCells = numCols * numRows;
        const padGrid = [];

        for (let col = 0; col < numCols; col++) {
            const rowArray = [];

            for (let row = 0; row < numRows; row++) {
                const pad = new FlipPad(padSize, padSize);

                container.appendChild(pad.getElement());
                rowArray.push(pad);
            }

            padGrid.push(rowArray);
        }

        this.container = container;
        this.padGrid = padGrid;
    }

    flip() {
        const nextColor = getRandomColor();

        const onLastPadFlippedCallback = () => {
            this.setNextColor(nextColor);
        }

        const numPads = this.getNumPads();
        let numPadsFlipped = 0;

        for (let rowArray of this.padGrid) {
            for (let flipPad of rowArray) {
                numPadsFlipped++;

                // When the last pad is flipped, have it call our callback
                if (numPadsFlipped >= numPads) {
                    flipPad.flip(onLastPadFlippedCallback);
                }
                else {
                    flipPad.flip();
                }
            }
        }
    }

    setNextColor(color) {
        for (let rowArray of this.padGrid) {
            for (let flipPad of rowArray) {
                flipPad.setNextPageColor(color);
            }
        }
    }

    getElement() {
        return this.container;
    }

    getNumPads() {
        const numCols = this.padGrid.length;
        // All row arrays within padGrid will be of the same length, so we
        // can just use the first
        const numRows = this.padGrid[0].length;

        return numCols * numRows;
    }
}

// A collection of stacked triangular SVG elements that form a sort of endless
// flipbook, turned through using the 'flip' method
class FlipPad {
    constructor(width, height) {
        this.width = width;
        this.height = height;

        // div used as container element for SVGs
        this.element = document.createElement('div');

        this.element.style.height = width + 'px';
        this.element.style.width = height + 'px';
        this.element.classList.add('tile');

        // These 'current' and 'next' flaps refer to the two current visible flaps,
        // and those folded up and hidden, to be displayed next on this.flip()
        const currentTopFlap = new Flap(Orientation.TOP, width, height);
        const currentBottomFlap = new Flap(Orientation.BOTTOM, width, height);
        const nextBottomFlap = new Flap(Orientation.BOTTOM, width, height);
        const nextTopFlap = new Flap(Orientation.TOP, width, height);

        // The next bottom flap is currently unfolded, beneath the current bottom flap.
        // We want to it to be folded facing away from us behind the current top flap.
        nextBottomFlap.rotate();

        this.element.appendChild(currentTopFlap.getElement());
        this.element.appendChild(currentBottomFlap.getElement());
        this.element.appendChild(nextBottomFlap.getElement());
        this.element.appendChild(nextTopFlap.getElement());

        this.currentTopFlap = currentTopFlap;
        this.currentBottomFlap = currentBottomFlap;
        this.nextTopFlap = nextTopFlap;
        this.nextBottomFlap = nextBottomFlap;

        this.setCurrentPageColor('red');
        this.setNextPageColor('blue');

        this.setRestingFlapDepths();

        this.isFlipping = false;
    }

    flip(onFlipFinishedCallback) {
        if (this.isFlipping) {
            return;
        }

        this.isFlipping = true;

        // Once flip transition completes, silently move now-hidden current flaps
        // into next flap, so 'recycling' them and using them as the next flaps
        const onTransitionEndCallback = () => {
            this.currentBottomFlap.disableTransition();
            this.currentTopFlap.disableTransition();

            this.currentBottomFlap.rotate();
            this.currentTopFlap.unrotate();

            // Hidden current flaps *become* next flaps
            this.swapFlapReferences();

            this.setRestingFlapDepths();

            if (onFlipFinishedCallback != null) {
                onFlipFinishedCallback();
            }

            this.isFlipping = false;
        }

        this.currentTopFlap.enableTransition();
        this.nextBottomFlap.enableTransition();

        this.setTransitionFlapDepths();

        this.currentTopFlap.rotate(onTransitionEndCallback);
        this.nextBottomFlap.unrotate();
    }

    setNextPageColor(color) {
        this.nextTopFlap.setColor(color);
        this.nextBottomFlap.setColor(color);
    }

    setCurrentPageColor(color) {
        this.currentTopFlap.setColor(color);
        this.currentBottomFlap.setColor(color);
    }

    setRestingFlapDepths() {
        this.currentTopFlap.bringToFront();
        this.currentBottomFlap.bringToFront();

        this.nextTopFlap.sendToBack();
        this.nextBottomFlap.sendToBack();
    }

    // Makes sure the flap that's folding over will appear in front of the
    // current bottom flap
    setTransitionFlapDepths() {
        this.nextBottomFlap.bringToFront();
        this.currentBottomFlap.sendToBack();
    }

    swapFlapReferences() {
        const tempBottomFlap = this.currentBottomFlap;
        const tempTopFlap = this.currentTopFlap;

        this.currentBottomFlap = this.nextBottomFlap;
        this.currentTopFlap = this.nextTopFlap;

        this.nextBottomFlap = tempBottomFlap;
        this.nextTopFlap = tempTopFlap;
    }

    getElement() {
        return this.element;
    }
}

const Orientation = {
    TOP: 1,
    BOTTOM: 2,
}

// Represents a single triangle SVG element that make up the pages of a FlipPad
class Flap {
    constructor(orientation, width, height) {
        const pointsString = this.getPointsStringFromOrientation(orientation, width, height);

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

        svg.classList.add('flipper');
        svg.style.width = width;
        svg.style.height = height;

        const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        polygon.setAttribute('points', pointsString);

        svg.appendChild(polygon);

        this.svgElement = svg;
        this.polygon = polygon;

        this.enableTransition();
        svg.style.position           = 'absolute';
        svg.style.backfaceVisibility = 'hidden';

        // TODO: using this causes weird rendering behaviour, previous colours
        // are shown when they shouldn't! Why?
        // svg.style.willChange         = 'transform';
    }

    // Creates a string of coordinates used to create an SVG 'polygon' element
    getPointsStringFromOrientation(orientation, width, height) {
        if (orientation === Orientation.TOP) {
            return '0 0, ' + width + ' 0, 0 ' + height;
        }
        else if (orientation === Orientation.BOTTOM) {
            return width + ' 0, ' + width + ' ' + height + ', 0 ' + height;
        }

        console.error('Invalid orientation');
    }

    // Rotates the triangle 180 degrees about a NE axis
    rotate(onTransitionEndCallback) {
        this.svgElement.style.transform = 'rotate3d(-1, 1, 0, 180deg)';

        if (onTransitionEndCallback != null) {
            this.svgElement.ontransitionend = onTransitionEndCallback;
        }
    }

    // Resets the transform performed by 'flip'
    unrotate(onTransitionEndCallback) {
        this.svgElement.style.transform = 'rotate3d(-1, 1, 0, 0deg)';

        if (onTransitionEndCallback != null) {
            this.svgElement.ontransitionend = onTransitionEndCallback;
        }
    }

    bringToFront() {
        this.svgElement.style.zIndex = 1;
    }

    sendToBack() {
        this.svgElement.style.zIndex = -1;
    }

    disableTransition() {
        this.svgElement.style.transition = null;
    }

    enableTransition() {
        this.svgElement.style.transition = 'transform 1s';
    }

    getElement() {
        return this.svgElement;
    }

    setColor(colorString) {
        this.polygon.style.fill = colorString;
    }
}

const container = document.getElementsByClassName('container');
const board = new Flipboard(8, 8, 80);

container[0].appendChild(board.getElement());

function doTheFlip() {
    board.flip();
}

function getRandomColor() {
    // One liner for random hex colour, nicked from SO somewhere
    return '#' + (0x1000000 + (Math.random()) * 0xffffff).toString(16).substr(1,6);
}
