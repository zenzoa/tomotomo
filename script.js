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
let incorrectCells = []

let seqLengthIndicator = null
let lastSequenceLength = 0


let isDarkMode = false

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

let saveState = () => {
    let data = {
        isDarkMode,
        puzzleWidth,
        puzzleHeight,
        puzzleGrid,
        valueGrid,
        rowHints,
        colHints
    }
    let stringifiedData = JSON.stringify(data)
    localStorage.setItem('tomotomo', stringifiedData)
}

let loadState = () => {
    let stringifiedData = localStorage.getItem('tomotomo')
    if (stringifiedData) {
        try {
            let data = JSON.parse(stringifiedData)
            if (data.isDarkMode) setDarkMode()
            puzzleWidth = data.puzzleWidth
            puzzleHeight = data.puzzleHeight
            puzzleGrid = data.puzzleGrid
            valueGrid = data.valueGrid
            rowHints = data.rowHints
            colHints = data.colHints
            drawBoard()
            return true
        } catch (e) {
            console.log('Unable to load game state', e)
            return false
        }
    } else {
        return false
    }
}

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

let checkIncorrectCells = () => {
    incorrectCells = []
    for (let y = 0; y < puzzleHeight; y++) {
        for (let x = 0; x < puzzleWidth; x++) {
            let cellValue = valueGrid[y][x]
            let puzzleValue = puzzleGrid[y][x]
            if ((cellValue === '#' && puzzleValue === '-') || (cellValue === '-' && puzzleValue === '#')) {
                incorrectCells.push({x, y})
            }
        }
    }
    if (incorrectCells.length > 0) {
        openModal('check-modal')
    } else {
        let grid = document.getElementById('grid')
        let checkmarkContainer = document.createElement('div')
        checkmarkContainer.id = 'checkmark-container'
        let checkmark = document.createElement('div')
        checkmark.className = 'checkmark'
        checkmarkContainer.appendChild(checkmark)
        grid.appendChild(checkmarkContainer)
        setTimeout(() => {
            checkmark.remove()
            checkmarkContainer.remove()
        }, 1000)
    }
}

let markIncorrectCells = () => {
    incorrectCells.forEach(cellPos => {
        let cell = cellGrid[cellPos.y][cellPos.x]
        cell.className = cell.className.replace('cell-unmarked', 'cell-marked')
    })
    setTimeout(() => {
        let markedCells = document.querySelectorAll('.cell-marked')
        for (let i = 0; i < markedCells.length; i++) {
            markedCells[i].className = markedCells[i].className.replace('cell-marked', 'cell-unmarked')
        }
    }, 2000)
    closeModal('check-modal')
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
            setCell(x, y, ' ')
        }
    }
    if (solvedState) {
        let board = document.getElementById('board')
        board.className = board.className.replace('board-solved', 'board-unsolved')
        solvedState = false
    }
    checkHints()
    cellsModifiedThisClick = []
}

let setCell = (x, y, value, isFirstCell) => {
    let oldValue = valueGrid[y][x]
    
    if (oldValue === value) return
    if (oldValue === '#' && guessing) return
    if (oldValue === '-' && guessing) return
    if (oldValue === '#' && value === '-' && !isFirstCell) return
    if (oldValue === '-' && value === '#' && !isFirstCell) return

    valueGrid[y][x] = value
    cellsModifiedThisClick.push({ x, y, oldValue })

    let newClass = 'cell-empty'
    if (value === '#') newClass = 'cell-true'
    else if (value === '-') newClass = 'cell-false'
    else if (value === '?') newClass = 'cell-guess-true'
    else if (value === '&') newClass = 'cell-guess-false'

    let cell = cellGrid[y][x]
    cell.className = 'cell ' + newClass + ' cell-unmarked'
}

let modifyCell = (x, y) => {
    cellsModifiedThisClick.forEach(cell => setCell(cell.x, cell.y, cell.oldValue))
    cellsModifiedThisClick = []

    let selectedRowHints = rowHintElements[firstCellClickedY]
    let selectedColHints = colHintElements[firstCellClickedX]
    let sequenceLength = 0

    firstCellSet = false
    let isFirstCell = x === firstCellClickedX && y === firstCellClickedY

    if (x === firstCellClickedX) {
        sequenceLength = Math.abs(y - firstCellClickedY) + 1
        let sign = y - firstCellClickedY > 0 ? 1 : -1
        for (let i = 0; i < sequenceLength; i++) {
            let y2 = firstCellClickedY + (sign * i)
            setCell(x, y2, cellValueThisClick, isFirstCell)
            if (y2 === firstCellClickedY) firstCellSet = true
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
            if (x2 !== firstCellClickedX || !firstCellSet) {
                setCell(x2, y, cellValueThisClick, isFirstCell)
            }
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

    saveState()
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
            cellValueThisClick = '&'
            doubleClicked = false
        } else if (valueGrid[y][x] !== '?' && valueGrid[y][x] !== '&') {
            cellValueThisClick = '?'
        } else {
            cellValueThisClick = ' '
        }
    } else {
        if (doubleClicked && lastCellClickedX === x && lastCellClickedY === y) {
            cellValueThisClick = '-'
            doubleClicked = false
        } else if (valueGrid[y][x] !== '#' && valueGrid[y][x] !== '-') {
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

    cell.className = 'cell '
    if (valueGrid[y][x] === '#') cell.className += 'cell-true'
    else if (valueGrid[y][x] === '-') cell.className += 'cell-false'
    else if (valueGrid[y][x] === '?') cell.className += 'cell-guess-true'
    else if (valueGrid[y][x] === '&') cell.className += 'cell-guess-false'
    else cell.className += 'cell-empty'
    cell.className += ' cell-unmarked'

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
    for (let y = 0; y < puzzleHeight; y++) {
        let cellRow = []
        for (let x = 0; x < puzzleWidth; x++) {
            cellRow.push(null)
        }
        cellGrid.push(cellRow)
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

            valueGrid = []
            for (let y = 0; y < puzzleHeight; y++) {
                let valueRow = []
                for (let x = 0; x < puzzleWidth; x++) {
                    valueRow.push(' ')
                }
                valueGrid.push(valueRow)
            }

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

let setLightMode = () => {
    let root = document.querySelector(':root')
    root.style.setProperty('--bgcolor', '#fff')
    root.style.setProperty('--bgcolor2', '#eee')
    root.style.setProperty('--fgcolor', '#333')
    root.style.setProperty('--boardborder', '#ddd')
    root.style.setProperty('--hintcolor', '#888')
    root.style.setProperty('--hintcolor-selected', '#666')
    root.style.setProperty('--hintcolor-solved', '#ccc')
    root.style.setProperty('--buttonbg', '#e9e9e9')
    root.style.setProperty('--buttonfg', '#666')
    root.style.setProperty('--buttonbg-hovered', '#d9d9d9')
    root.style.setProperty('--buttonfg-hovered', '#000')
    root.style.setProperty('--buttonbg-selected', '#666')
    root.style.setProperty('--buttonfg-selected', '#fff')
    root.style.setProperty('--buttonbg-selected-hovered', '#333')
    root.style.setProperty('--buttonfg-selected-hovered', '#fff')
    root.style.setProperty('--modalbg', 'rgba(64, 64, 64, 0.9)')
    root.style.setProperty('--modalshadowcolor', 'rgba(64, 64, 64, 0.1)')
    let darkmodeButton = document.getElementById('darkmode')
    darkmodeButton.innerHTML = '<i class="sun-icon"></i>'
    document.body.className = 'lightmode'
    isDarkMode = false
}

let setDarkMode = () => {
    let root = document.querySelector(':root')
    root.style.setProperty('--bgcolor', '#333')
    root.style.setProperty('--bgcolor2', '#111')
    root.style.setProperty('--fgcolor', '#fff')
    root.style.setProperty('--boardborder', '#666')
    root.style.setProperty('--hintcolor', '#ccc')
    root.style.setProperty('--hintcolor-selected', '#fff')
    root.style.setProperty('--hintcolor-solved', '#777')
    root.style.setProperty('--buttonbg', '#444')
    root.style.setProperty('--buttonfg', '#eee')
    root.style.setProperty('--buttonbg-hovered', '#777')
    root.style.setProperty('--buttonfg-hovered', '#fff')
    root.style.setProperty('--buttonbg-selected', '#ccc')
    root.style.setProperty('--buttonfg-selected', '#333')
    root.style.setProperty('--buttonbg-selected-hovered', '#eee')
    root.style.setProperty('--buttonfg-selected-hovered', '#111')
    root.style.setProperty('--modalbg', 'rgba(0, 0, 0, 0.9)')
    root.style.setProperty('--modalshadowcolor', 'rgba(0, 0, 0, 0.1)')
    let darkmodeButton = document.getElementById('darkmode')
    darkmodeButton.innerHTML = '<i class="moon-icon"></i>'
    document.body.className = 'darkmode'
    isDarkMode = true
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

    // check modal
    document.getElementById('check').addEventListener('click', () => {
        checkIncorrectCells()
    })
    document.getElementById('mark-yes').addEventListener('click', () => {
        markIncorrectCells()
    })
    document.getElementById('mark-no').addEventListener('click', () => {
        closeModal('check-modal')
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

    // dark mode button
    let darkmodeButton = document.getElementById('darkmode')
    darkmodeButton.addEventListener('click', () => {
        if (isDarkMode) setLightMode()
        else setDarkMode()
        saveState()
    })

    // try to load existing puzzle
    if (loadState() === false) {
        // start with 10x10 puzzle
        newPuzzle(10)
    }

    // fade out splashscreen
    setTimeout(() => {
        let splashscreen = document.getElementById('splashscreen')
        splashscreen.className = 'hidden'
    }, 1000)
}