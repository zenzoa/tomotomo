onmessage = (e) => {
    let size = e.data
    let puzzleGrid = null
    let rowHints = null
    let colHints = null
    let passes = 0
    while (passes < 50) {
        puzzleGrid = createPuzzle(size, size)
        let hints = createHints(puzzleGrid)
        rowHints = hints.rowHints
        colHints = hints.colHints
        if (solvePuzzle(rowHints, colHints, size, size)) {
            console.log('puzzle created successfully in', passes + 1, (passes > 0 ? 'passes' : 'pass'))
            break
        }
        passes++
    }

    postMessage({
        puzzleGrid,
        rowHints,
        colHints
    })
}

let createPuzzle = (width, height) => {
    let puzzleGrid = Array(height).fill(0).map(() => Array(width).fill('-'))

    let randomPoint = (max) => Math.floor(Math.random() * max)

    let addPoint = (x, y) => {
        if (puzzleGrid[y] && puzzleGrid[y][x]) {
            puzzleGrid[y][x] = '#'
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

    let iterations = width * 1.2
    for (let i = 0; i < iterations; i++) {
        if (Math.random() < 0.5) drawLine()
        else drawCircle()
    }

    return puzzleGrid
}

let createHints = (puzzleGrid) => {
    let puzzleWidth = puzzleGrid[0].length
    let rowHints = []
    let colHints = []

    let getHints = (cells) => {
        let hints = []
        let sequenceLength = 0
        cells.forEach((cell, i) => {
            if (cell === '#') {
                sequenceLength++
            }
            if (sequenceLength > 0 && (cell !== '#' || i === cells.length - 1)) {
                hints.push(sequenceLength)
                sequenceLength = 0
            }
        })
        return hints
    }

    rowHints = puzzleGrid.map(row => getHints(row))

    colHints = []
    for (let x = 0; x < puzzleWidth; x++) {
        let column = puzzleGrid.map(row => row[x])
        colHints.push(getHints(column))
    }

    return { rowHints, colHints }
}

let solvePuzzle = (rowHints, colHints, puzzleWidth, puzzleHeight) => {
    let findOverlaps = (hints, size) => {
        // draw each sequence from the start of the line
        let line = ''
        for (let i = 0; i < hints.length; i++) {
            line += '#'.repeat(hints[i])
            if (i < hints.length - 1) {
                line += ' '
            }
        }

        // find out how many empty spaces are left at the end of the line
        let leftoverSpaces = size - line.length
        
        // remove that many cells from the start of each sequence
        let newLine = ''
        for (let i = 0; i < hints.length; i++) {
            let sequenceLength = Math.max(0, hints[i] - leftoverSpaces)
            newLine += ' '.repeat(Math.min(leftoverSpaces, hints[i]))
            newLine += '#'.repeat(sequenceLength)
            if (i < hints.length - 1) {
                newLine += ' '
            }
        }
        newLine = newLine.padEnd(size, ' ')

        return newLine.split('')
    }

    let solveLine = (hints, line) => {
        if (hints.length === 0) return line

        let possibilities = []
        let sequenceIndex = 0
        let startingPoints = Array(hints.length).fill(0)

        let drawLine = () => {
            let possibility = ''
            for (let i = 0; i < hints.length; i++) {
                if (startingPoints[i] - possibility.length >= 0) {
                    let gap = '-'.repeat(startingPoints[i] - possibility.length)
                    let seq = '#'.repeat(hints[i])
                    possibility += gap + seq
                } else {
                    break
                }
            }
            possibility = possibility.padEnd(line.length, '-')
            return possibility.split('')
        }

        // find possibilities
        while (sequenceIndex >= 0) {
            let sequence = hints[sequenceIndex]
            let start = startingPoints[sequenceIndex]
            if (start + sequence > line.length) {
                // no room left on line -> previous sequence
                sequenceIndex--
            } else if (line[start - 1] === '#') {
                // reveals cell-true -> previous sequence
                sequenceIndex--
            } else if (line[start + sequence] === '#') {
                // abutts cell-true -> keep looking
            } else if (line.slice(start, start + sequence).includes('-')) {
                // covers cell-false -> keep looking
            } else {
                // fits!
                if (sequenceIndex === hints.length - 1) {
                    // last sequence -> add possiblity and keep looking
                    let possibility = drawLine()
                    possibilities.push(possibility)
                } else {
                    // more sequences -> next sequence
                    sequenceIndex++
                    startingPoints[sequenceIndex] = start + sequence + 1
                    continue
                }
            }
            startingPoints[sequenceIndex]++
        }

        if (possibilities.length === 0) return line

        // merge possibilities
        let mergedPossibilities = []
        for (let i = 0; i < line.length; i++) {
            let cell = ''
            if (line[i] !== ' ') {
                cell = line[i]
            } else {
                possibilities.forEach(possibility => {
                    if (!cell) {
                        cell = possibility[i]
                    } else if (cell !== possibility[i]) {
                        cell = ' '
                    }
                })
            }
            mergedPossibilities.push(cell)
        }

        return mergedPossibilities
    }

    
    let rowSolutions = rowHints.map(rowHintGroup => findOverlaps(rowHintGroup, puzzleWidth))
    let colSolutions = colHints.map(colHintGroup => findOverlaps(colHintGroup, puzzleHeight))
    
    let solutions = Array(puzzleHeight).fill(0).map(_ => Array(puzzleWidth).fill(' '))
    for (let x = 0; x < puzzleWidth; x++) {
        for (let y = 0; y < puzzleHeight; y++) {
            if (rowSolutions[y][x] === '#' || colSolutions[x][y] === '#') {
                solutions[y][x] = '#'
            }
        }
    }

    let passes = 0
    let solveComplete = false
    while (!solveComplete && passes < 100) {
        solveComplete = true

        // solve rows
        let solvedRows = []
        for (let y = 0; y < puzzleHeight; y++) {
            let solvedRow = solveLine(rowHints[y], solutions[y])
            if (solvedRow.includes(' ')) solveComplete = false
            solvedRows.push(solvedRow)
        }

        // solve columns
        let solvedCols = Array(puzzleWidth).fill(0)
        for (let x = 0; x < puzzleWidth; x++) {
            let col = Array(puzzleHeight).fill(' ')
            for (let y = 0; y < puzzleHeight; y++) {
                col[y] = solvedRows[y][x]
            }
            let solvedCol = solveLine(colHints[x], col)
            if (solvedCol.includes(' ')) solveComplete = false
            solvedCols[x] = solvedCol
        }

        // combine solutions
        for (let x = 0; x < puzzleWidth; x++) {
            for (let y = 0; y < puzzleHeight; y++) {
                solutions[y][x] = solvedCols[x][y]
            }
        }

        passes++
    }

    return solveComplete
}