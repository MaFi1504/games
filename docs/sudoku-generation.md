# How does Sudoku generation work?

## Phase 1 – Build a complete solution

The three diagonal 3×3 boxes are filled independently with a shuffled set of 1–9 (they can't conflict with each other). A recursive backtracking algorithm then fills the remaining 54 cells: try a random digit, check row/column/box constraints, move forward — or backtrack if no digit fits.

## Phase 2 – Carve out clues

Cells are removed one at a time in random order. After each removal the solver counts the number of solutions. If more than one solution exists, the digit is restored. This continues until the desired number of clues is reached.

## Why uniqueness matters

A valid Sudoku puzzle must have exactly one solution. The uniqueness check is the most expensive step — it runs a full backtracking search after every removal, which is why generation can take a moment on harder difficulties.

See also: [Sudoku solving algorithms – Wikipedia](https://en.wikipedia.org/wiki/Sudoku_solving_algorithms)
