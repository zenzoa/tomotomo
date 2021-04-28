// TODO: fade out solved hints
// TODO: remove ambiguous/unsolveable solutions

let pointerIsDown = false
let cellsModifiedThisClick = []
let cellStateThisClick = 'cell-empty'
let timeOfLastClick = 0
let lastCellClicked = ''
let firstCellClickedX = 0
let firstCellClickedY = 0
let doubleClicked = false
let solvedState = false
let guessing = false
let DOUBLE_CLICK_TIME = 300

let createPuzzle = (width, height) => {
    let puzzle = Array(height).fill(0).map(() => Array(width).fill('cell-false'))

    let randomPoint = (max) => Math.floor(Math.random() * max)

    let addPoint = (x, y) => {
        if (puzzle[y] && puzzle[y][x]) {
            puzzle[y][x] = 'cell-true'
        }
    }

    let drawLine = () => { // uses Bresenham's line algorithm
        let x0 = randomPoint(width)
        let y0 = randomPoint(height)
        let x1 = randomPoint(width)
        let y1 = randomPoint(height)

        let dx = Math.abs(x1 - x0)
        let sx = x0 < x1 ? 1 : -1
        let dy = -Math.abs(y1 - y0)
        let sy = y0 < y1 ? 1 : -1
        let err = dx + dy

        while (true) {
            addPoint(x0, y0)
            if (x0 === x1 && y0 === y1) {
                break
            } else {
                let e2 = 2 * err
                if (e2 >= dy) {
                    err += dy
                    x0 += sx
                }
                if (e2 <= dx) {
                    err += dx
                    y0 += sy
                }
            }
        }
    }

    let drawCircle = () => { // uses Bresenham's circle algorithm
        let r = Math.max(2, randomPoint(width))
        let xc = randomPoint(width)
        let yc = randomPoint(height)

        let drawCircleArc = (xc, yc, x, y) => {
            addPoint(xc + x, yc + y)
            addPoint(xc - x, yc + y)
            addPoint(xc + x, yc - y)
            addPoint(xc - x, yc - y)
            addPoint(xc + y, yc + x)
            addPoint(xc - y, yc + x)
            addPoint(xc + y, yc - x)
            addPoint(xc - y, yc - x)
        }

        let x = 0
        let y = r
        let d = 3 - 2 * r
        drawCircleArc(xc, yc, x, y)
        while (y >= x) {
            x++
            if (d > 0) {
                y--
                d = d + 4 * (x - y) + 10
            } else {
                d = d + 4 * x + 6
            }
            drawCircleArc(xc, yc, x, y)
        }

    }

    let iterations = width
    for (let i = 0; i < iterations; i++) {
        if (Math.random() < 0.5) drawLine()
        else drawCircle()
    }

    return puzzle
}

let doesSolutionWork = (puzzle) => {
    let solutionWorks = true
    let width = puzzle.length
    let height = puzzle[0].length
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let cell = document.getElementById('cell-' + x + '-' + y)
            let cellState = puzzle[y][x]
            if (cellState === 'cell-true' && !cell.className.includes('cell-true')) {
                solutionWorks = false
            }
            if (cellState === 'cell-false' && cell.className.includes('cell-true')) {
                solutionWorks = false
            }
        }
    }
    return solutionWorks
}

let createHints = (puzzle) => {
    let getHints = (cells) => {
        let hints = []
        let sequenceLength = 0
        cells.forEach((cell, i) => {
            if (cell === 'cell-true') {
                sequenceLength++
            }
            if (sequenceLength > 0 && (cell !== 'cell-true' || i === cells.length - 1)) {
                hints.push(sequenceLength)
                sequenceLength = 0
            }
        })
        return hints
    }

    let rowHints = puzzle.map(row => getHints(row))

    let colHints = []
    let width = puzzle[0].length
    for (let x = 0; x < width; x++) {
        let column = puzzle.map(row => row[x])
        colHints.push(getHints(column))
    }
    
    return { rowHints, colHints }
}

let revealOneCell = (puzzle) => {
    let width = puzzle.length
    let height = puzzle[0].length
    let guesses = 0
    while (guesses < 1000) {
        let x = Math.floor(Math.random() * width)
        let y = Math.floor(Math.random() * height)
        let cell = document.getElementById('cell-' + x + '-' + y)
        let cellState = puzzle[y][x]
        if ((cellState === 'cell-true' && !cell.className.includes('cell-true') || (cellState === 'cell-false' && !cell.className.includes('cell-false')))) {
            cell.className = cell.className.replace('cell-empty', cellState)
            cell.className = cell.className.replace('cell-true', cellState)
            cell.className = cell.className.replace('cell-false', cellState)
            cell.className = cell.className.replace('cell-guess', cellState)
            break
        }
        guesses++
    }
}

let drawPuzzleSolution = (puzzle) => {
    let width = puzzle.length
    let height = puzzle[0].length
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let cell = document.getElementById('cell-' + x + '-' + y)
            let cellState = puzzle[y][x]
            cell.className = cell.className.replace('cell-empty', cellState)
        }
    }
    let board = document.getElementById('board')
    board.className = board.className.replace('board-unsolved', 'board-solved')
    solvedState = true
}

let clearGrid = () => {
    let cells = document.getElementsByClassName('cell')
    for (let i = 0; i < cells.length; i++) {
        let cell = cells[i]
        clearCell(cell)
    }
    if (solvedState) {
        let board = document.getElementById('board')
        board.className = board.className.replace('board-solved', 'board-unsolved')
        solvedState = false
    }
}

let setCell = (cell, value, isFirstCell) => {
    if (typeof cell === 'string') cell = document.getElementById(cell)
    let oldClassName = cell.className
    cell.className = cell.className.replace('cell-empty', value)
    cell.className = cell.className.replace('cell-guess', value)
    if ((value !== 'cell-guess' && !guessing) || isFirstCell) {
        cell.className = cell.className.replace('cell-true', value)
    }
    if ((value === 'cell-empty' && !guessing) || isFirstCell) {
        cell.className = cell.className.replace('cell-false', value)
    }
    if (!cellsModifiedThisClick.includes(cell.id) && oldClassName !== cell.className) {
        cellsModifiedThisClick.push(cell.id)
    }
}

let clearCell = (cell) => {
    if (typeof cell === 'string') cell = document.getElementById(cell)
    cell.className = cell.className.replace('cell-true', 'cell-empty')
    cell.className = cell.className.replace('cell-false', 'cell-empty')
    cell.className = cell.className.replace('cell-guess', 'cell-empty')
}

let modifyCell = (puzzle, cell, x, y) => {
    cellsModifiedThisClick.forEach(cellId => {
        clearCell(cellId)
    })

    let selectedRowHints = document.getElementById('row-hints-' + firstCellClickedY)
    let selectedColHints = document.getElementById('col-hints-' + firstCellClickedX)
    let sequenceLength = 0

    if (x === firstCellClickedX) {
        sequenceLength = Math.abs(y - firstCellClickedY) + 1
        let sign = y - firstCellClickedY > 0 ? 1 : -1
        for (let i = 0; i < sequenceLength; i++) {
            let y2 = firstCellClickedY + (sign * i)
            let cellId = 'cell-' + x + '-' + y2
            // TODO: don't set cell-true over cell-false, only over cell-empty
            setCell(cellId, cellStateThisClick)
        }
        if (sequenceLength > 1) selectedColHints.className = selectedColHints.className.replace('hints-unselected', 'hints-selected')
    } else {
        selectedColHints.className = selectedColHints.className.replace('hints-selected', 'hints-unselected')
    }

    if (y === firstCellClickedY) {
        sequenceLength = Math.abs(x - firstCellClickedX) + 1
        let sign = x - firstCellClickedX > 0 ? 1 : -1
        for (let i = 0; i < sequenceLength; i++) {
            let x2 = firstCellClickedX + (sign * i)
            let cellId = 'cell-' + x2 + '-' + y
            setCell(cellId, cellStateThisClick)
        }
        if (sequenceLength > 1) selectedRowHints.className = selectedRowHints.className.replace('hints-unselected', 'hints-selected')
    } else {
        selectedRowHints.className = selectedRowHints.className.replace('hints-selected', 'hints-unselected')
    }

    let drawLength = document.getElementById('draw-length')
    if (sequenceLength > 3 || drawLength.innerText.length > 0) {
        drawLength.innerText = sequenceLength
    }

    if (doesSolutionWork(puzzle)) {
        drawPuzzleSolution(puzzle)
    }
}

let clickCell = (puzzle, cell, x, y) => {
    pointerIsDown = true

    let clickTime = Date.now()
    if (timeOfLastClick > 0 && clickTime - timeOfLastClick < DOUBLE_CLICK_TIME) {
        doubleClicked = !doubleClicked
    } else {
        doubleClicked = false
    }
    timeOfLastClick = clickTime

    let cellIsEmpty = cell.className.includes('cell-empty')
    let cellIsGuess = cell.className.includes('cell-guess')
    if (guessing) {
        if (cellIsEmpty) cellStateThisClick = 'cell-guess'
        else cellStateThisClick = 'cell-empty'
    } else {
        if (doubleClicked && lastCellClicked === cell.id) {
            cellStateThisClick = 'cell-false'
        } else if (cellIsEmpty || cellIsGuess) {
            cellStateThisClick = 'cell-true'
        } else {
            cellStateThisClick = 'cell-empty'
        }
    }

    lastCellClicked = cell.id
    firstCellClickedX = x
    firstCellClickedY = y

    modifyCell(puzzle, cell, x, y)
}

let drawCell = (puzzle, x, y) => {
    let cell = document.createElement('div')
    cell.className = 'cell cell-empty'
    cell.id = 'cell-' + x + '-' + y
    cell.addEventListener('mousemove', () => {
        if (pointerIsDown && !solvedState) modifyCell(puzzle, cell, x, y)
    })
    cell.addEventListener('mousedown', () => {
        if (!solvedState) clickCell(puzzle, cell, x, y, /* isFirstCell */ true)
    })
    return cell
}

let drawRow = (puzzle, y) => {
    let width = puzzle.length
    let row = document.createElement('div')
    row.className = 'row row-y'
    for (let i = 0; i < width; i++) {
        let cell = drawCell(puzzle, i, y)
        row.appendChild(cell)
    }
    return row
}

let drawGrid = (puzzle) => {
    let height = puzzle[0].length
    let grid = document.createElement('div')
    grid.className = 'grid'
    grid.id = 'grid'
    for (let i = 0; i < height; i++) {
        let row = drawRow(puzzle, i)
        grid.appendChild(row)
    }
    return grid
}

let drawHints = (hints, type) => {
    let hintContainer = document.createElement('div')
    hintContainer.className = 'hints'
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
    })
    return hintContainer
}

let drawBoard = (puzzle) => {
    let { rowHints, colHints } = createHints(puzzle)

    let board = document.createElement('div')
    board.className = 'board board-unsolved'
    board.id = 'board'

    let topOfBoard = document.createElement('div')
    topOfBoard.className = 'board-top'
    board.appendChild(topOfBoard)

    let corner = document.createElement('div')
    corner.className = 'board-corner'
    topOfBoard.appendChild(corner)

    let drawLength = document.createElement('div')
    drawLength.className = 'draw-length'
    drawLength.id = 'draw-length'
    corner.appendChild(drawLength)

    let colHintsContainer = drawHints(colHints, 'col')
    colHintsContainer.id = 'col-hints'
    topOfBoard.appendChild(colHintsContainer)

    let bottomOfBoard = document.createElement('div')
    bottomOfBoard.className = 'board-bottom'
    board.appendChild(bottomOfBoard)

    let rowHintsContainer = drawHints(rowHints, 'row')
    rowHintsContainer.id = 'row-hints'
    bottomOfBoard.appendChild(rowHintsContainer)

    let grid = drawGrid(puzzle)
    bottomOfBoard.appendChild(grid)

    let main = document.getElementById('main')
    main.innerHTML = ''
    main.appendChild(board)

    setCellSize(puzzle)
}

let setCellSize = (puzzle) => {
    let width = puzzle.length
    let height = puzzle[0].length

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
    let puzzleSize = Math.max(width, height)
    let cellSize = Math.floor(boardSize / puzzleSize)

    let root = document.querySelector(':root')
    root.style.setProperty('--cellsize', cellSize + 'px')

    let realBoardWidth = document.getElementById('board').offsetWidth
    root.style.setProperty('--buttonswidth', realBoardWidth + 'px')
}

window.onresize = () => {
    setCellSize(window.puzzle)
}

window.onload = () => {
    let newPuzzle = (size) => {
        window.puzzle = createPuzzle(size, size)
        drawBoard(window.puzzle)
        closeModal('new-modal')
    }

    let openModal = (id) => {
        let modal = document.getElementById(id)
        modal.className = modal.className.replace('modal-closed', 'modal-open')
    }

    let closeModal = (id) => {
        let modal = document.getElementById(id)
        modal.className = modal.className.replace('modal-open', 'modal-closed')
    }

    document.addEventListener('mouseup', () => {
        pointerIsDown = false
        cellsModifiedThisClick = []
        let drawLength = document.getElementById('draw-length')
        drawLength.innerText = ''
        let selectedRowHints = document.getElementById('row-hints-' + firstCellClickedY)
        let selectedColHints = document.getElementById('col-hints-' + firstCellClickedX)
        selectedRowHints.className = selectedRowHints.className.replace('hints-selected', 'hints-unselected')
        selectedColHints.className = selectedColHints.className.replace('hints-selected', 'hints-unselected')
    })
    
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
    document.getElementById('new-30').addEventListener('click', () => {
        newPuzzle(30)
    })
    document.getElementById('new-cancel').addEventListener('click', () => {
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
        drawPuzzleSolution(puzzle)
        closeModal('solve-modal')
    })
    document.getElementById('solve-no').addEventListener('click', () => {
        closeModal('solve-modal')
    })

    // hint button
    document.getElementById('hint').addEventListener('click', () => {
        revealOneCell(window.puzzle)
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