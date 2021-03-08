// Segments a given image into a grid of square tiles, creating a list of
// SVG 'patterns' to be referenced in each tile in a grid of SVG elements
class SvgImageGrid {
    constructor(imageUrl, cellSize, numCols, numRows, gridId) {
        const imageWidth = numCols * cellSize;
        const imageHeight = numRows * cellSize;

        this.patternImage = this.createPatternImage(
            imageUrl, imageWidth, imageHeight
        );

        this.gridId = gridId;
        this.numCols = numCols;
        this.numRows = numRows;
        this.cellSize = cellSize;
    }

    // Creates the list of pattern elements for each tile in the grid-segmented
    // image, and returns them in an SVG container element
    createPatternsDefs() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

        svg.setAttribute('width', 0);
        svg.setAttribute('height', 0);

        svg.appendChild(defs);

        for (let col = 0; col < this.numCols; col++) {
            for (let row = 0; row < this.numRows; row++) {
                const pattern = document.createElementNS(
                    'http://www.w3.org/2000/svg',
                    'pattern'
                );

                pattern.id = this.getCellPatternId(col, row);

                pattern.setAttribute('patternUnits', 'userSpaceOnUse');

                pattern.setAttribute('x', '-' + col * this.cellSize);
                pattern.setAttribute('y', '-' + row * this.cellSize);

                pattern.setAttribute('width', this.numCols * this.cellSize);
                pattern.setAttribute('height', this.numRows * this.cellSize);

                pattern.appendChild(this.patternImage.cloneNode(false));

                defs.appendChild(pattern);
            }
        }

        return svg;
    }

    // Creates a full-size SVG image element given an image URL,
    // sized to the given dimensions
    createPatternImage(imageUrl, width, height) {
        const patternImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');

        patternImage.setAttribute('href', imageUrl);

        patternImage.setAttribute('preserveAspectRatio', 'none');
        patternImage.setAttribute('width', width);
        patternImage.setAttribute('height', height);

        return patternImage;
    }

    // Given a row and column index, returns the element ID of the pattern that
    // displays that cell's portion of the overall image
    getCellPatternId(col, row) {
        return this.gridId + '-' + col + '-' + row;
    }
}

// A grid of flipbook-style tiles that together display a series of images,
// shown one after the other, transitioned between by 'flipping' the flipbook cells
class Flipboard {
    constructor(numCols, numRows, padSize, imageUrlList) {
        const containerDiv = document.createElement('div');

        const patternsDiv = document.createElement('div');
        patternsDiv.style.height = '0px';
        patternsDiv.style.width = '0px';

        const gridDiv = this.createGridDiv(numCols, '4px');

        containerDiv.appendChild(patternsDiv);
        containerDiv.appendChild(gridDiv);

        const padGrid = this.createPadGrid(numCols, numRows, padSize);

        for (let row = 0; row < numRows; row++) {
            for (let col = 0; col < numCols; col++) {
                const pad = padGrid[col][row];
                gridDiv.appendChild(pad.getElement());
            }
        }

        this.imageGrids = [];

        for (let i = 0; i < imageUrlList.length; i++) {
            // TODO: improve ID naming here - use filename?
            const svgImageGrid = new SvgImageGrid(
                imageUrlList[i], padSize, numCols, numRows, i
            );

            const patternsDefs = svgImageGrid.createPatternsDefs();
            patternsDiv.appendChild(patternsDefs);

            this.imageGrids.push(svgImageGrid);
        }

        this.containerDiv = containerDiv;
        this.padGrid = padGrid;

        this.numCols = numCols;
        this.numRows = numRows;

        this.setCurrentImage(this.imageGrids[0]);
        this.setNextImage(this.imageGrids[1]);
    }

    createPadGrid(numCols, numRows, padSize) {
        const padGrid = [];

        // Iterate over rows + columns 'in reverse', i.e. for each row in each column,
        // so we can lookup cells in the padGrid like 'padGrid[x][y]'
        for (let col = 0; col < numCols; col++) {
            const rowArray = [];

            for (let row = 0; row < numRows; row++) {
                const pad = new FlipPad(padSize);
                rowArray.push(pad);
            }

            padGrid.push(rowArray);
        }

        return padGrid;
    }

    createGridDiv(numCols, cellGap) {
        const gridDiv = document.createElement('div');

        gridDiv.style.display = 'grid';

        // Allows additional styling, e.g. margin
        gridDiv.classList.add('flipboard');

        gridDiv.style.gridTemplateColumns = 'repeat(' + numCols + ', min-content)';
        gridDiv.style.columnGap = cellGap;
        gridDiv.style.rowGap = cellGap;

        return gridDiv;
    }

    flip() {
        const numPads = this.numRows * this.numCols;
        let numPadsFlipped = 0;

        const onLastPadFlippedCallback = () => {
            // TODO: change next image to next in series here?
        }

        for (let rowArray of this.padGrid) {
            for (let flipPad of rowArray) {
                numPadsFlipped++;

                // TODO: have this 'cascading flip' effect be configurable
                window.setTimeout(() => {
                    if (numPadsFlipped >= numPads) {
                        flipPad.flip(onLastPadFlippedCallback);
                    }
                    else {
                        flipPad.flip();
                    }
                }, (Math.random() * 400) + (numPadsFlipped * 40));
            }
        }
    }

    setCurrentImage(svgImageGrid) {
        for (let row = 0; row < this.numRows; row++) {
            for (let col = 0; col < this.numCols; col++) {
                const cellFillPatternId = svgImageGrid.getCellPatternId(col, row);
                this.padGrid[col][row].setCurrentPageFill('url(#' + cellFillPatternId + ')');
            }
        }
    }

    setNextImage(svgImageGrid) {
        for (let row = 0; row < this.numRows; row++) {
            for (let col = 0; col < this.numCols; col++) {
                const cellFillPatternId = svgImageGrid.getCellPatternId(col, row);
                this.padGrid[col][row].setNextPageFill('url(#' + cellFillPatternId + ')');
            }
        }
    }

    getElement() {
        return this.containerDiv;
    }
}

// A collection of stacked triangular SVG elements that form a sort of endless
// flipbook, turned through using the 'flip' method
class FlipPad {
    constructor(size) {
        this.size = size;

        // div used as container element for SVGs
        this.element = document.createElement('div');

        this.element.style.height = size + 'px';
        this.element.style.width = size + 'px';
        this.element.classList.add('tile');

        // These 'current' and 'next' flaps refer to the two current visible flaps,
        // and those folded up and hidden, to be displayed next on this.flip()
        const currentTopFlap = new Flap(Orientation.TOP, size);
        const currentBottomFlap = new Flap(Orientation.BOTTOM, size);
        const nextBottomFlap = new Flap(Orientation.BOTTOM, size);
        const nextTopFlap = new Flap(Orientation.TOP, size);

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

            // Run 'on finished' callback argument, if given
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

    setNextPageFill(fillString) {
        this.nextTopFlap.setFill(fillString);
        this.nextBottomFlap.setFill(fillString);
    }

    setCurrentPageFill(fillString) {
        this.currentTopFlap.setFill(fillString);
        this.currentBottomFlap.setFill(fillString);
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
    constructor(orientation, size) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

        svg.style.width = size;
        svg.style.height = size;

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

        const pathString = this.getPointsStringFromOrientation(orientation, size, 10);
        path.setAttribute('d', pathString);

        svg.appendChild(path);

        this.svgPath = path;
        this.svgElement = svg;

        this.enableTransition();
        svg.style.position           = 'absolute';
        svg.style.backfaceVisibility = 'hidden';

        // TODO: using this can sometimes cause weird rendering behaviour,
        // keep an eye on it and find out why
        svg.style.willChange         = 'transform';
    }

    getPointsStringFromOrientation(orientation, size, cornerRadius) {
        if (orientation === Orientation.TOP) {
            return this.createTopFlapPathString(size, cornerRadius);
        }
        else if (orientation === Orientation.BOTTOM) {
            return this.createBottomFlapPathString(size, cornerRadius);
        }

        console.error('Invalid orientation');
    }

    createBottomFlapPathString(sideLength, cornerRadius) {
        const edgeLength = sideLength - cornerRadius * 2;
        const root2 = Math.sqrt(2);
        const radiusOverRt2 = cornerRadius / root2;

        let pathString = '';

        pathString += 'm' + (edgeLength+cornerRadius) + ' ' + sideLength;
        pathString += 'h' + (-edgeLength);
        pathString += 'a' + cornerRadius + ' ' + cornerRadius + ' 0 0 1 '
            + (-radiusOverRt2) + ' ' + (-(cornerRadius-radiusOverRt2));
        pathString += 'l' + (edgeLength+(cornerRadius*root2)) + ' '
            + (-(edgeLength+(cornerRadius*root2)));
        pathString += 'a' + cornerRadius + ' ' + cornerRadius + ' 0 0 1 '
            + (cornerRadius-radiusOverRt2) + ' ' + radiusOverRt2;
        pathString += 'v' + edgeLength;
        pathString += 'a' + cornerRadius + ' ' + cornerRadius + ' 0 0 1 '
            + (-cornerRadius) + ' ' + cornerRadius;
        pathString += 'z';

        return pathString;
    }

    createTopFlapPathString(sideLength, cornerRadius) {
        const edgeLength = sideLength - cornerRadius * 2;
        const root2 = Math.sqrt(2);
        const radiusOverRt2 = cornerRadius / root2;

        let pathString = '';

        pathString += 'm' + cornerRadius + ' 0';
        pathString += 'h' + edgeLength;
        pathString += 'a' + cornerRadius + ' ' + cornerRadius + ' 0 0 1 '
            + radiusOverRt2 + ' ' + (cornerRadius-radiusOverRt2);
        pathString += 'l' + -(edgeLength+(cornerRadius*root2)) + ' '
            + (edgeLength+(cornerRadius*root2));
        pathString += 'a' + cornerRadius + ' ' + cornerRadius + ' 0 0 1 '
            + -(cornerRadius-radiusOverRt2) + ' ' + (-radiusOverRt2);
        pathString += 'v' + (-edgeLength);
        pathString += 'a' + cornerRadius + ' ' + cornerRadius + ' 0 0 1 '
            + cornerRadius + ' ' + (-cornerRadius);
        pathString += 'z';

        return pathString;
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

    setFill(fillString) {
        this.svgPath.style.fill = fillString;
    }
}

// Demo code creating a flipboard capable of displaying a series of images

const container = document.getElementsByClassName('container');

const imageUrls = ['image/1.jpg', 'image/2.jpg', 'image/3.jpg', 'image/4.jpg'];
const flipboard = new Flipboard(6, 4, 100, imageUrls);

container[0].appendChild(flipboard.getElement());

function flip() {
    flipboard.flip();
}
