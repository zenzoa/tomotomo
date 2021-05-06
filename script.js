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

let gradientColors = [
    '#59a5dd',
    '#496bbe',
    '#e55388',
    '#e57d88',
    '#e59f88',
    '#e5d988',
    '#5ac5cc',
    '#6dd5cc',
    '#92e89a',
    '#48b37c',
    '#b0316e',
    '#c74c66',
    '#db885c',
    '#c773bd',
    '#8e4994'
]

let setGradient = () => {
    let angle = Math.floor(Math.random() * 359)
    let midpoint = Math.floor(Math.random() * 50) + 25
    let color1 = gradientColors[Math.floor(Math.random() * gradientColors.length)]
    let color2 = gradientColors[Math.floor(Math.random() * gradientColors.length)]
    let color3 = gradientColors[Math.floor(Math.random() * gradientColors.length)]
    let gradient = `linear-gradient(${angle}deg, ${color1} 0%, ${color2} ${midpoint}%, ${color3} 100%)`
    let root = document.querySelector(':root')
    root.style.setProperty('--gridgradient', gradient)
}

let markIncorrectCells = () => {
    for (let y = 0; y < puzzleHeight; y++) {
        for (let x = 0; x < puzzleWidth; x++) {
            let cellValue = valueGrid[y][x]
            let puzzleValue = puzzleGrid[y][x]
            if ((cellValue === '#' && puzzleValue === '-') || (cellValue === '-' && puzzleValue === '#')) {
                cellGrid[y][x].className = cellGrid[y][x].className.replace('cell-unmarked', 'cell-marked')
            }
        }
    }
}

let checkHintsForLine = (hints, line) => {
    let solvedHints = []
    let isLineBroken = false

    let containsGuesses = false
    line = line.map(c => {
        if (c === '?') {
            containsGuesses = true
            return '#'
        } else if (c === '&') {
            containsGuesses = true
            return '-'
        } else {
            return c
        }
    })

    // get sequences
    let sequences = []
    let seqStarts = []
    let currentSequence = ''
    let currentRun = ''
    let currentStart = -1
    for (let i = 0; i < line.length; i++) {
        let cell = line[i]
        let lastCell = line[i - 1]
        if (
            cell === '#' &&
            (lastCell === '-' || i === 0 ||
            (lastCell === '#' && currentStart >= 0))
        ) {
            currentRun += '#'
            if (currentStart < 0) currentStart = i
        }
        if (cell === '-') {
            currentSequence += currentRun + ' '
            currentRun = ''
            if (currentStart < 0) currentStart = i
        }
        if (cell === ' ') {
            if (currentSequence.includes('#')) {
                sequences.push(currentSequence)
                seqStarts.push(currentStart)
            }
            currentRun = ''
            currentSequence = []
            currentStart = -1
        }
        if (i === line.length - 1 && (cell === '#' || cell === '-')) {
            if (currentRun.includes('#')) currentSequence += currentRun
            if (currentSequence.includes('#')) {
                sequences.push(currentSequence)
                seqStarts.push(currentStart)
            }
        }
    }

    // check sequences
    sequences.forEach((sequence, seqIndex) => {
        let seqParts = sequence.split(' ').filter(s => s.trim().length > 0)
        let seqStart = seqStarts[seqIndex]
        let startHintIndexes = []

        hints.forEach((_, startHintIndex) => {
            let minSpaceBefore = hints.slice(0, startHintIndex).reduce((prev, curr) => (prev + curr + 1), 0) - 1
            if (seqStart < minSpaceBefore) return

            let currentHintIndex = startHintIndex
            let seqFitsHints = true
            seqParts.forEach(seqPart => {
                if (seqPart.length === hints[currentHintIndex]) {
                    currentHintIndex++
                } else {
                    seqFitsHints = false
                }
            })

            let minSpaceAfter = hints
                .slice(startHintIndex + seqParts.length)
                .reduce((prev, curr) => (prev + curr + 1), 0) - 1
            let spaceAfter = line.length - seqStart - sequence.length
            if (spaceAfter < minSpaceAfter) seqFitsHints = false

            if (seqFitsHints) startHintIndexes.push(startHintIndex)
        })

        if (startHintIndexes.length === 1) {
            seqParts.forEach((_, i) => {
                solvedHints.push(startHintIndexes[0] + i)
            })
        }
    })

    return {
        solvedHints: isLineBroken ? [] : solvedHints,
        containsGuesses
    }
}

let checkHints = () => {
    let allHintsSolved = true

    let oldSolvedHints = document.querySelectorAll('.hint-solved')
    for (i = 0; i < oldSolvedHints.length; i++) {
        oldSolvedHints[i].className = 'hint hint-unsolved'
    }

    let colGrid = Array(puzzleWidth).fill(null).map(_ => [])
    rowHints.forEach((rowHintsGroup, y) => {
        let { solvedHints, containsGuesses } = checkHintsForLine(rowHintsGroup, valueGrid[y])
        if (containsGuesses || solvedHints.length !== rowHintsGroup.length) allHintsSolved = false
        solvedHints.forEach(solvedHintIndex => {
            let hintEl = document.getElementById('row-hint-' + y + '-' + solvedHintIndex)
            hintEl.className = 'hint hint-solved'
        })
        for (x = 0; x < puzzleWidth; x++) {
            colGrid[x].push(valueGrid[y][x])
        }
    })

    colHints.forEach((colHintsGroup, x) => {
        let { solvedHints, containsGuesses } = checkHintsForLine(colHintsGroup, colGrid[x])
        if (containsGuesses || solvedHints.length !== colHintsGroup.length) allHintsSolved = false
        solvedHints.forEach(solvedHintIndex => {
            let hintEl = document.getElementById('col-hint-' + x + '-' + solvedHintIndex)
            hintEl.className = 'hint hint-solved'
        })
    })

    if (allHintsSolved) {
        drawPuzzleSolution()
    }
}

let drawPuzzleSolution = () => {
    if (!solvedState) {
        for (let y = 0; y < puzzleHeight; y++) {
            for (let x = 0; x < puzzleWidth; x++) {
                let puzzleValue = puzzleGrid[y][x]
                setCell(x, y, puzzleValue)
            }
        }
        let board = document.getElementById('board')
        board.className = board.className.replace('board-unsolved', 'board-solved')
        solvedState = true
    }
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
    checkHints()
}

let setCell = (x, y, value) => {
    let oldValue = valueGrid[y][x]
    
    if (oldValue === value) return
    if (oldValue === '#' && guessing) return
    if (oldValue === '-' && (guessing || value === '#')) return

    valueGrid[y][x] = value
    cellsModifiedThisClick.push({ x, y })

    let newClass = 'cell-empty'
    if (value === '#') newClass = 'cell-true'
    else if (value === '-') newClass = 'cell-false'
    else if (value === '?') newClass = 'cell-guess-true'
    else if (value === '&') newClass = 'cell-guess-false'

    let cell = cellGrid[y][x]
    cell.className = 'cell ' + newClass + ' cell-unmarked'
}

let clearCell = (x, y) => {
    setCell(x, y, ' ')
}

let modifyCell = (x, y) => {
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
            setCell(x, y2, cellValueThisClick)
        }
        if (!colHintsSelected) {
            colHintsSelected = true
            selectedColHints.className = 'hint-group hints-selected'
        }
    } else {
        if (colHintsSelected) {
            colHintsSelected = false
            selectedColHints.className = 'hint-group hints-unselected'
        }
    }

    if (y === firstCellClickedY) {
        sequenceLength = Math.abs(x - firstCellClickedX) + 1
        let sign = x - firstCellClickedX > 0 ? 1 : -1
        for (let i = 0; i < sequenceLength; i++) {
            let x2 = firstCellClickedX + (sign * i)
            setCell(x2, y, cellValueThisClick)
        }
        if (!rowHintsSelected) {
            rowHintsSelected = true
            selectedRowHints.className = 'hint-group hints-selected'
        }
    } else {
        if (rowHintsSelected) {
            rowHintsSelected = false
            selectedRowHints.className = 'hint-group hints-unselected'
        }
    }

    if (sequenceLength < lastSequenceLength || (sequenceLength !== lastSequenceLength && sequenceLength > 2)) {
        seqLengthIndicator.innerText = sequenceLength <= 2 ? '' : sequenceLength
        seqLengthIndicator.style.top = (gridY + cellSize * y + cellSize / 2 - 48) + 'px'
        seqLengthIndicator.style.left = (gridX + cellSize * x + cellSize / 2 - 48) + 'px'
    }
    lastSequenceLength = sequenceLength
}

let clickCell = (x, y) => {
    pointerIsDown = true

    let clickTime = Date.now()
    if (timeOfLastClick > 0 && clickTime - timeOfLastClick < DOUBLE_CLICK_TIME) {
        doubleClicked = true
    } else {
        doubleClicked = false
    }
    timeOfLastClick = clickTime

    if (guessing) {
        if (doubleClicked && lastCellClickedX === x && lastCellClickedY === y) {
            if (valueGrid[y][x] === ' ' || valueGrid[y][x] === '?') {
                cellValueThisClick = '&'
            }
        } else if (valueGrid[y][x] === ' ') {
            cellValueThisClick = '?'
        } else {
            cellValueThisClick = ' '
        }
    } else {
        if (doubleClicked && lastCellClickedX === x && lastCellClickedY === y) {
            cellValueThisClick = '-'
        } else if (valueGrid[y][x] === ' ' || valueGrid[y][x] === '?' || valueGrid[y][x] === '&') {
            cellValueThisClick = '#'
        } else {
            cellValueThisClick = ' '
        }
    }

    lastCellClickedX = x
    lastCellClickedY = y
    firstCellClickedX = x
    firstCellClickedY = y

    modifyCell(x, y)
}

let drawCell = (x, y) => {
    let cell = document.createElement('div')
    cell.className = 'cell cell-empty cell-unmarked'
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
        hintGroupElement.className = 'hint-group hints-unselected'
        hintGroupElement.id = type + '-hints-' + i
        hintGroup.forEach((hint, j) => {
            let hintElement = document.createElement('div')
            hintElement.className = 'hint hint-unsolved'
            hintElement.id = type + '-hint-' + i + '-' + j
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

    setGradient()

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
    let spinner = document.getElementById('spinner-container')
    spinner.className = ''

    if (window.Worker) {
        puzzleWorker = new Worker('puzzleworker.js')
        puzzleWorker.postMessage(size)
        puzzleWorker.onmessage = (e) => {
            
            solvedState = false
            puzzleWidth = size
            puzzleHeight = size
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
        cellsModifiedThisClick = []
        seqLengthIndicator.innerText = ''
        lastSequenceLength = 0

        setTimeout(() => {

            rowHintElements.forEach(el => {el.className = 'hint-group hints-unselected'})
            colHintElements.forEach(el => {el.className = 'hint-group hints-unselected'})
            rowHintsSelected = false
            colHintsSelected = false

            checkHints()

        }, DOUBLE_CLICK_TIME)

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

    // check button
    document.getElementById('check').addEventListener('click', () => {
        markIncorrectCells()
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