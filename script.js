// Controls a Flipboard instance, providing it with the image data to display,
// and regularly triggering transitions between the images, making sure
// the 'current' and 'next' images are set accordingly so they're displayed
// in sequence
class Cycler {
    constructor(flipboard, cyclePeriodSeconds, imageUrlList) {
        this.imageList = [];
        this.flipboard = flipboard;

        const gridGap = flipboard.getGridGap();
        const cellSize = flipboard.getPadSize();
        const numCols = flipboard.getNumCols();
        const numRows = flipboard.getNumRows();

        for (let i = 0; i < imageUrlList.length; i++) {
            // TODO: improve ID naming here - use filename?
            const svgImageGrid = new SvgImageGrid({
                imageUrl: imageUrlList[i],
                cellSize: cellSize,
                numCols: numCols,
                numRows: numRows,
                gridGap: gridGap,
                gridId: i
            });

            const patternsDefs = svgImageGrid.createPatternsDefs();
            flipboard.getPatternsDiv().appendChild(patternsDefs);

            this.imageList.push(svgImageGrid);
        }

        this.currentImageIndex = 0;

        // TODO: this assumes >= 2 images have been given! Handle case where
        // e.g. 1 image was given
        flipboard.setCurrentFill(this.imageList[0]);
        flipboard.setNextFill(this.imageList[1]);

        this.cyclePeriodMilliseconds = cyclePeriodSeconds * 1000;
        this.isCycling = false;
    }

    enableCycling() {
        if (this.cycleInterval != null) {
            clearInterval(this.cycleInterval);
        }

        const cyclerRef = this;

        this.cycleInterval = setInterval(
            () => { cyclerRef.cycle(); },
            this.cyclePeriodMilliseconds
        );

        this.isCycling = true;
    }

    disableCycling() {
        if (this.cycleInterval != null) {
            clearInterval(this.cycleInterval);
        }

        this.isCycling = false;
    }

    manualCycle() {
        this.cycle();

        // If already cycling, re-enable cycling to reset timer interval
        if (this.isCycling) {
            this.enableCycling();
        }
    }

    cycle() {
        this.flipboard.flip(() => {
            this.incrementCurrentImageIndex();
            flipboard.setNextFill(this.imageList[this.getNextImageIndex()]);
        });
    }

    getNextImageIndex() {
        return (this.currentImageIndex + 1) % this.imageList.length;
    }

    incrementCurrentImageIndex() {
        if (this.currentImageIndex >= this.imageList.length - 1) {
            this.currentImageIndex = 0;
        }
        else {
            this.currentImageIndex++;
        }
    }
}

// Segments a given image into a grid of square tiles, creating a list of
// SVG 'patterns' to be referenced in each tile in a grid of SVG elements
class SvgImageGrid {
    constructor({
        imageUrl,
        cellSize,
        numCols,
        numRows,
        gridGap,
        gridId = Math.random()
    }) {
        const imageWidth = numCols * cellSize + ((numCols - 1) * gridGap);
        const imageHeight = numRows * cellSize + ((numRows - 1) * gridGap);

        this.patternImage = this.createPatternImage(
            imageUrl, imageWidth, imageHeight
        );

        this.gridId = gridId;

        this.gridGap = gridGap;
        this.numCols = numCols;
        this.numRows = numRows;
        this.cellSize = cellSize;

        this.imageWidth = imageWidth;
        this.imageHeight = imageHeight;
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

                const xOffset = col * this.cellSize + (col * this.gridGap);
                const yOffset = row * this.cellSize + (row * this.gridGap);

                pattern.setAttribute('x', '-' + xOffset);
                pattern.setAttribute('y', '-' + yOffset);

                pattern.setAttribute('width', this.imageWidth);
                pattern.setAttribute('height', this.imageHeight);

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

    // Gets the string that's used to apply the (col, row)-th segment of the image
    // to an SVG element
    getFillString(col, row) {
        return 'url(#' + this.getCellPatternId(col, row) + ')';
    }
}

// A grid of flipbook-style tiles that together display a series of images,
// shown one after the other, transitioned between by 'flipping' the flipbook cells
class Flipboard {
    constructor({
        numCols,
        numRows,
        padSize = 100,
        gridGap = 4,
        cornerRadius = 5,
    }) {
        const containerDiv = document.createElement('div');

        // Create div for storing SVG <pattern> elements, required by SvgImageGrid instances
        // TODO: should it be Flipboard's job to create and maintain this?
        const patternsDiv = document.createElement('div');
        patternsDiv.style.height = '0px';
        patternsDiv.style.width = '0px';

        const gridDiv = this.createGridDiv(numCols, gridGap + 'px');

        containerDiv.appendChild(patternsDiv);
        containerDiv.appendChild(gridDiv);

        const padGrid = this.createPadGrid(numCols, numRows, padSize, cornerRadius);

        for (let row = 0; row < numRows; row++) {
            for (let col = 0; col < numCols; col++) {
                const pad = padGrid[col][row];
                gridDiv.appendChild(pad.getElement());
            }
        }

        this.containerDiv = containerDiv;
        this.patternsDiv = patternsDiv;
        this.padGrid = padGrid;

        this.gridGap = gridGap;
        this.padSize = padSize;
        this.numCols = numCols;
        this.numRows = numRows;
    }

    createPadGrid(numCols, numRows, padSize, cornerRadius) {
        const padGrid = [];

        // Iterate over rows + columns 'in reverse', i.e. for each row in each column,
        // so we can lookup cells in the padGrid like 'padGrid[x][y]'
        for (let col = 0; col < numCols; col++) {
            const rowArray = [];

            for (let row = 0; row < numRows; row++) {
                const pad = new FlipPad(padSize, cornerRadius);
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

    flip(onTransitionEndCallback) {
        const numPads = this.numRows * this.numCols;
        let numPadsFlipped = 0;

        for (let rowArray of this.padGrid) {
            for (let flipPad of rowArray) {
                numPadsFlipped++;

                if (numPadsFlipped >= numPads) {
                    flipPad.flip(onTransitionEndCallback);
                }
                else {
                    flipPad.flip();
                }
            }
        }
    }

    setCurrentFill(filler) {
        for (let row = 0; row < this.numRows; row++) {
            for (let col = 0; col < this.numCols; col++) {
                const fillString = filler.getFillString(col, row);
                this.padGrid[col][row].setCurrentPageFill(fillString);
            }
        }
    }

    setNextFill(filler) {
        for (let row = 0; row < this.numRows; row++) {
            for (let col = 0; col < this.numCols; col++) {
                const fillString = filler.getFillString(col, row);
                this.padGrid[col][row].setNextPageFill(fillString);
            }
        }
    }

    getPadSize() {
        return this.padSize;
    }

    getNumCols() {
        return this.numCols;
    }

    getNumRows() {
        return this.numRows;
    }

    getGridGap() {
        return this.gridGap;
    }

    getElement() {
        return this.containerDiv;
    }

    getPatternsDiv() {
        return this.patternsDiv;
    }
}

// A collection of stacked triangular SVG elements that form a sort of endless
// flipbook, turned through using the 'flip' method
class FlipPad {
    constructor(size, cornerRadius) {
        this.size = size;

        // div used as container element for SVGs
        this.element = document.createElement('div');

        this.element.style.height = size + 'px';
        this.element.style.width = size + 'px';
        this.element.classList.add('tile');

        // These 'current' and 'next' flaps refer to the two current visible flaps,
        // and those folded up and hidden, to be displayed next on this.flip()
        const currentTopFlap = new Flap(Orientation.TOP, size, cornerRadius);
        const currentBottomFlap = new Flap(Orientation.BOTTOM, size, cornerRadius);
        const nextBottomFlap = new Flap(Orientation.BOTTOM, size, cornerRadius);
        const nextTopFlap = new Flap(Orientation.TOP, size, cornerRadius);

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
    constructor(orientation, size, cornerRadius) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

        svg.style.width = size;
        svg.style.height = size;

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

        const pathString = this.getPointsStringFromOrientation(
            orientation, size, cornerRadius
        );

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

const flipboard = new Flipboard({
    numCols: 6,
    numRows: 4,
    padSize: 100,
    gridGap: 4,
    cornerRadius: 5
});

const cycler = new Cycler(flipboard, 4, ['image/1.jpg', 'image/2.jpg', 'image/3.jpg', 'image/4.jpg']);

container[0].appendChild(flipboard.getElement());

function flip() {
    cycler.manualCycle();
}