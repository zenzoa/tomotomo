// TODO: fade out solved hints
// TODO: random gradients
// TODO: dark mode

let puzzleWorker = null

let pointerIsDown = false

let cellsModifiedThisClick = []
let cellValueThisClick = 'cell-empty'

let timeOfLastClick = 0
let lastCellClickedX = 0
let lastCellClickedY = 0
let firstCellClickedX = 0
let firstCellClickedY = 0

let doubleClicked = false
let solvedState = false
let guessing = false

let puzzleWidth = 0
let puzzleHeight = 0
let gridX = 0
let gridY = 0
let cellSize = 0

let puzzleGrid = []
let valueGrid = []
let cellGrid = []

let rowHints = []
let colHints = []
let rowHintElements = []
let colHintElements = []
let rowHintsSelected = false
let colHintsSelected = false

let seqLengthIndicator = null
let lastSequenceLength = 0

let DOUBLE_CLICK_TIME = 300

let doesSolutionWork = () => {
    let solutionWorks = true
    for (let y = 0; y < puzzleHeight; y++) {
        for (let x = 0; x < puzzleWidth; x++) {
            let userValue = valueGrid[y][x]
            let puzzleValue = puzzleGrid[y][x]
            if (userValue !== puzzleValue) {
                solutionWorks = false
            }
        }
    }
    return solutionWorks
}

let revealOneCell = () => {
    let guesses = 0
    while (guesses < 1000) {
        let x = Math.floor(Math.random() * puzzleWidth)
        let y = Math.floor(Math.random() * puzzleHeight)
        let cellValue = valueGrid[y][x]
        let puzzleValue = puzzleGrid[y][x]
        if (cellValue !== puzzleValue) {
            setCell(x, y, puzzleValue, /* isFirstCell */ true)
            break
        }
        guesses++
    }
}

let drawPuzzleSolution = () => {
    for (let y = 0; y < puzzleHeight; y++) {
        for (let x = 0; x < puzzleWidth; x++) {
            let puzzleValue = puzzleGrid[y][x]
            setCell(x, y, puzzleValue, /* isFirstCell */ true)
        }
    }
    let board = document.getElementById('board')
    board.className = board.className.replace('board-unsolved', 'board-solved')
    solvedState = true
}

let clearGrid = () => {
    for (let y = 0; y < puzzleHeight; y++) {
        for (let x = 0; x < puzzleWidth; x++) {
            clearCell(x, y)
        }
    }
    if (solvedState) {
        let board = document.getElementById('board')
        board.className = board.className.replace('board-solved', 'board-unsolved')
        solvedState = false
    }
}

let setCell = (x, y, value, isFirstCell) => {
    let oldValue = valueGrid[y][x]
    
    if (oldValue === value) return
    if (oldValue === '#' && !isFirstCell && guessing) return
    if (oldValue === '-' && !isFirstCell && (guessing || value === '#')) return

    valueGrid[y][x] = value
    cellsModifiedThisClick.push({ x, y })

    let oldClass = 'cell-empty'
    if (oldValue === '#') oldClass = 'cell-true'
    else if (oldValue === '-') oldClass = 'cell-false'
    else if (oldValue === '?') oldClass = 'cell-guess'

    let newClass = 'cell-empty'
    if (value === '#') newClass = 'cell-true'
    else if (value === '-') newClass = 'cell-false'
    else if (value === '?') newClass = 'cell-guess'

    let cell = cellGrid[y][x]
    cell.className = cell.className.replace(oldClass, newClass)
}

let clearCell = (x, y) => {
    setCell(x, y, ' ', /* isFirstCell */ true)
}

let modifyCell = (x, y, isFirstCell) => {
    cellsModifiedThisClick.forEach(cell => clearCell(cell.x, cell.y))
    cellsModifiedThisClick = []

    let selectedRowHints = rowHintElements[firstCellClickedY]
    let selectedColHints = colHintElements[firstCellClickedX]
    let sequenceLength = 0

    if (x === firstCellClickedX) {
        sequenceLength = Math.abs(y - firstCellClickedY) + 1
        let sign = y - firstCellClickedY > 0 ? 1 : -1
        for (let i = 0; i < sequenceLength; i++) {
            let y2 = firstCellClickedY + (sign * i)
            setCell(x, y2, cellValueThisClick, isFirstCell)
        }
        if (sequenceLength > 1 && !colHintsSelected) {
            colHintsSelected = true
            selectedColHints.className = selectedColHints.className.replace('hints-unselected', 'hints-selected')
        }
    } else {
        if (colHintsSelected) {
            colHintsSelected = false
            selectedColHints.className = selectedColHints.className.replace('hints-selected', 'hints-unselected')
        }
    }

    if (y === firstCellClickedY) {
        sequenceLength = Math.abs(x - firstCellClickedX) + 1
        let sign = x - firstCellClickedX > 0 ? 1 : -1
        for (let i = 0; i < sequenceLength; i++) {
            let x2 = firstCellClickedX + (sign * i)
            setCell(x2, y, cellValueThisClick, isFirstCell)
        }
        if (sequenceLength > 1 && !rowHintsSelected) {
            rowHintsSelected = true
            selectedRowHints.className = selectedRowHints.className.replace('hints-unselected', 'hints-selected')
        }
    } else {
        if (rowHintsSelected) {
            rowHintsSelected = false
            selectedRowHints.className = selectedRowHints.className.replace('hints-selected', 'hints-unselected')
        }
    }

    if (sequenceLength < lastSequenceLength || (sequenceLength !== lastSequenceLength && sequenceLength > 3)) {
        seqLengthIndicator.innerText = sequenceLength <= 3 ? '' : sequenceLength
        seqLengthIndicator.style.top = (gridY + cellSize * y + cellSize / 2 - 36) + 'px'
        seqLengthIndicator.style.left = (gridX + cellSize * x + cellSize / 2 - 36) + 'px'
    }
    lastSequenceLength = sequenceLength

    if (doesSolutionWork()) {
        drawPuzzleSolution()
    }
}

let clickCell = (x, y) => {
    pointerIsDown = true

    let clickTime = Date.now()
    if (timeOfLastClick > 0 && clickTime - timeOfLastClick < DOUBLE_CLICK_TIME) {
        doubleClicked = !doubleClicked
    } else {
        doubleClicked = false
    }
    timeOfLastClick = clickTime

    let cellIsEmpty = valueGrid[y][x] === ' '
    let cellIsGuess = valueGrid[y][x] === '?'
    if (guessing) {
        if (cellIsEmpty) cellValueThisClick = '?'
        else cellValueThisClick = ' '
    } else {
        if (doubleClicked && lastCellClickedX === x && lastCellClickedY === y) {
            cellValueThisClick = '-'
        } else if (cellIsEmpty || cellIsGuess) {
            cellValueThisClick = '#'
        } else {
            cellValueThisClick = ' '
        }
    }

    lastCellClickedX = x
    lastCellClickedY = y
    firstCellClickedX = x
    firstCellClickedY = y

    modifyCell(x, y, /* isFirstCell */ true)
}

let drawCell = (x, y) => {
    let cell = document.createElement('div')
    cell.className = 'cell cell-empty'
    cell.id = 'cell-' + x + '-' + y
    cellGrid[y][x] = cell

    let pointerMove = (e) => {
        e.preventDefault()
        if (pointerIsDown && !solvedState) {
            if (e.touches) {
                let event = e.touches[0]
                let relX = event.clientX - gridX
                let relY = event.clientY - gridY
                let cellX = Math.floor(relX / cellSize)
                let cellY = Math.floor(relY / cellSize)
                if (cellX >= 0 && cellY >= 0 && cellX < puzzleWidth && cellY < puzzleHeight) {
                    modifyCell(cellX, cellY)
                }
            } else {
                modifyCell(x, y)
            }
        }
    }
    cell.addEventListener('mousemove', pointerMove)
    cell.addEventListener('touchmove', pointerMove)

    let pointerDown = (e) => {
        e.preventDefault()
        if (!solvedState) clickCell(x, y)
    }
    cell.addEventListener('mousedown', pointerDown)
    cell.addEventListener('touchstart', pointerDown)

    return cell
}

let drawRow = (y) => {
    let row = document.createElement('div')
    row.className = 'row row-y'
    for (let i = 0; i < puzzleWidth; i++) {
        let cell = drawCell(i, y)
        row.appendChild(cell)
    }
    return row
}

let drawGrid = () => {
    let grid = document.createElement('div')
    grid.className = 'grid'
    grid.id = 'grid'
    for (let i = 0; i < puzzleHeight; i++) {
        let row = drawRow(i)
        grid.appendChild(row)
    }
    return grid
}

let drawHints = (hints, type) => {
    let hintContainer = document.createElement('div')
    hintContainer.className = 'hints'

    if (type === 'col') colHintElements = []
    else rowHintElements = []

    hints.forEach((hintGroup, i) => {
        let hintGroupElement = document.createElement('div')
        hintGroupElement.className = 'hint-group hints-unselected hints-unsolved'
        hintGroupElement.id = type + '-hints-' + i
        hintGroup.forEach(hint => {
            let hintElement = document.createElement('div')
            hintElement.className = 'hint'
            hintElement.innerText = hint
            hintGroupElement.appendChild(hintElement)
        })
        hintContainer.appendChild(hintGroupElement)
        if (type === 'col') colHintElements.push(hintGroupElement)
        else rowHintElements.push(hintGroupElement)
    })
    return hintContainer
}

let drawBoard = () => {
    cellGrid = []
    valueGrid = []
    for (let y = 0; y < puzzleHeight; y++) {
        let cellRow = []
        let valueRow = []
        for (let x = 0; x < puzzleWidth; x++) {
            cellRow.push(null)
            valueRow.push(' ')
        }
        cellGrid.push(cellRow)
        valueGrid.push(valueRow)
    }
    

    let board = document.createElement('div')
    board.className = 'board board-unsolved'
    board.id = 'board'

    let topOfBoard = document.createElement('div')
    topOfBoard.className = 'board-top'
    board.appendChild(topOfBoard)

    let corner = document.createElement('div')
    corner.className = 'board-corner'
    topOfBoard.appendChild(corner)

    let colHintsContainer = drawHints(colHints, 'col')
    colHintsContainer.id = 'col-hints'
    topOfBoard.appendChild(colHintsContainer)

    let bottomOfBoard = document.createElement('div')
    bottomOfBoard.className = 'board-bottom'
    board.appendChild(bottomOfBoard)

    let rowHintsContainer = drawHints(rowHints, 'row')
    rowHintsContainer.id = 'row-hints'
    bottomOfBoard.appendChild(rowHintsContainer)

    let grid = drawGrid()
    bottomOfBoard.appendChild(grid)

    let main = document.getElementById('main')
    main.innerHTML = ''
    main.appendChild(board)

    seqLengthIndicator = document.getElementById('sequence-length')

    window.onresize()
}

let setCellSize = () => {
    let boardWidth = window.innerWidth
    let boardHeight = window.innerHeight

    let rowHintsWidth = document.getElementById('row-hints').offsetWidth
    let colHintsHeight = document.getElementById('col-hints').offsetHeight
    boardWidth -= rowHintsWidth
    boardHeight -= colHintsHeight

    // remove body and board padding
    boardWidth -= (40 + 20)
    boardHeight -= (40 + 20 + 80)

    let boardSize = Math.min(boardWidth, boardHeight)
    let puzzleSize = Math.max(puzzleWidth, puzzleHeight)
    cellSize = Math.floor(boardSize / puzzleSize)

    let root = document.querySelector(':root')
    root.style.setProperty('--cellsize', cellSize + 'px')

    let realBoardWidth = document.getElementById('board').offsetWidth
    root.style.setProperty('--buttonswidth', realBoardWidth + 'px')
}

let newPuzzle = (size) => {
    solvedState = false
    puzzleWidth = size
    puzzleHeight = size

    let spinner = document.getElementById('spinner-container')
    spinner.className = ''

    if (window.Worker) {
        puzzleWorker = new Worker('puzzleworker.js')
        puzzleWorker.postMessage(size)
        puzzleWorker.onmessage = (e) => {
            puzzleGrid = e.data.puzzleGrid
            rowHints = e.data.rowHints
            colHints = e.data.colHints
            spinner.className = 'hidden'
            drawBoard()
            closeModal('new-modal')
        }
    }
}

let openModal = (id) => {
    let modal = document.getElementById(id)
    modal.className = modal.className.replace('modal-closed', 'modal-open')
}

let closeModal = (id) => {
    let modal = document.getElementById(id)
    modal.className = modal.className.replace('modal-open', 'modal-closed')
}

window.onresize = () => {
    setCellSize()

    let cornerCell = cellGrid[0][0].getBoundingClientRect()
    gridX = cornerCell.x
    gridY = cornerCell.y
}

window.onload = () => {
    let pointerUp = (e) => {
        pointerIsDown = false
        if (cellGrid.length > 0) {
            cellsModifiedThisClick = []

            seqLengthIndicator.innerText = ''
        
            let selectedRowHints = rowHintElements[firstCellClickedY]
            let selectedColHints = colHintElements[firstCellClickedX]
            selectedRowHints.className = selectedRowHints.className.replace('hints-selected', 'hints-unselected')
            selectedColHints.className = selectedColHints.className.replace('hints-selected', 'hints-unselected')
            rowHintsSelected = false
            colHintsSelected = false
            
            lastSequenceLength = 0
        }
    }
    document.addEventListener('mouseup', pointerUp)
    document.addEventListener('touchend', pointerUp)
    document.addEventListener('touchcancel', pointerUp)
    
    // new modal
    document.getElementById('new').addEventListener('click', () => {
        openModal('new-modal')
    })
    document.getElementById('new-5').addEventListener('click', () => {
        newPuzzle(5)
    })
    document.getElementById('new-10').addEventListener('click', () => {
        newPuzzle(10)
    })
    document.getElementById('new-15').addEventListener('click', () => {
        newPuzzle(15)
    })
    document.getElementById('new-20').addEventListener('click', () => {
        newPuzzle(20)
    })
    document.getElementById('new-25').addEventListener('click', () => {
        newPuzzle(25)
    })
    document.getElementById('new-cancel').addEventListener('click', () => {
        if (puzzleWorker) puzzleWorker.terminate()
        let spinner = document.getElementById('spinner-container')
        spinner.className = 'hidden'
        closeModal('new-modal')
    })
    
    // reset modal
    document.getElementById('reset').addEventListener('click', () => {
        openModal('reset-modal')
    })
    document.getElementById('reset-yes').addEventListener('click', () => {
        clearGrid()
        closeModal('reset-modal')
    })
    document.getElementById('reset-no').addEventListener('click', () => {
        closeModal('reset-modal')
    })

    // solve modal
    document.getElementById('solve').addEventListener('click', () => {
        openModal('solve-modal')
    })
    document.getElementById('solve-yes').addEventListener('click', () => {
        drawPuzzleSolution()
        closeModal('solve-modal')
    })
    document.getElementById('solve-no').addEventListener('click', () => {
        closeModal('solve-modal')
    })

    // hint button
    document.getElementById('hint').addEventListener('click', () => {
        revealOneCell()
    })

    // guess button
    let guessButton = document.getElementById('guess')
    guessButton.addEventListener('click', () => {
        if (guessing) {
            guessButton.className = guessButton.className.replace('button-selected', 'button-unselected')
            guessing = false
        } else {
            guessButton.className = guessButton.className.replace('button-unselected', 'button-selected')
            guessing = true
        }
    })

    // start with 10x10 puzzle
    newPuzzle(10)
}