import { TransitionComposer, Flipboard, Cycler } from '../script.js';

const composer = new TransitionComposer({
    numCols: 6,
    numRows: 4,
    rowCoeff: 50,
    colCoeff: 50,
    maxVariation: 600,
});

const flipboard = new Flipboard({
    numCols: 6,
    numRows: 4,
    padSize: 100,
    gridGap: 4,
    cornerRadius: 5,
    transitionComposer: composer,
});

const cycler = new Cycler(
    flipboard,
    4,
    ['image/1.jpg', 'image/2.jpg', 'image/3.jpg', 'image/4.jpg']
);

document.getElementsByClassName('container')[0].appendChild(flipboard.getElement());

document.getElementById('cycleButton').onclick = () => cycler.manualCycle();
