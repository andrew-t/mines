# Pure Skill Minesweeper

If you're around my age, you'll remember Windows Minesweeper. It was one of several games included with Windows back in the day to try to train users in the use of the then-newfangled ‘mouse’. It doesn’t come with Windows any more. You can get Minesweeper for Windows 10, but the developers have… made some choices.d

If you haven’t played it, Minesweeper is a grid of squares, some of which have mines underneath, and your job is to click on all the others. If you click on a mine, you lose. You can also flag squares with the right mouse button to record that you think they are a mine. Your only clue as to where the mines are is that when you click on a square that isn’t a mine, it tells you how many of the eight adjacent squares are mines. If that number is zero, the game automatically clicks on all the adjacent squares for you so you can get a little patch to start from. Hopefully that will include a 1 in a tight corner so there’s only one place its mine can go, and that will complete a nearby 1 so you can get some more numbers to work from, eventually leading you to complete the game.d

If you’re not so lucky, you might not get a solvable board. A common situation is that you get down to the last two spaces and you know one of them is a mine but there’s no wat to predict which one. You have to guess. Heads you win, tails you just wasted 10 minutes carefully clearing the whole board only to be scuppered by a forced guess.d

[There’s a version of Minesweeper that guarantees you never have to guess](https://www.chiark.greenend.org.uk/~sgtatham/puzzles/js/mines.html), which is very nice. It neatly solves the problem of unwinnable games, and while I find that always knowing you can make a deduction can be too big a clue, in regular Minesweeper you could even lose straight off the bat — you have to guess the first move and maybe it’ll be a mine. In this case, Windows Minesweeper quietly chooses a different arrangement of mines and pretends like you got lucky after all — but it doesn’t do that if you’re stuck at the _end_.

So what if we went further? [This is a version of Minesweeper where you will _never_ be penalised when forced to guess](github.andrewt.net/mines). Any time there simply isn’t enough information to deduce a safe move, we’ll pull Windows’s trick and quietly rearrange the mines so you don’t get penalised.d

But since that would on its own make the game too easy, the flip side of this coin is that if you _can_ in theory deduce a safe move but guess anyway, the code will quietly rearrange the mines so that your unnecessary risk backfires and you lose.

This game is also rigged to give you a zero on your first click rather than simply a non-mine space. To be honest this is mostly to avoid situations that are computationally difficult — this is not what I would call carefully optimised code. If I wanted to expand this I would (eg) make it precalculate things while you’re staring at the screen instead of waiting for you to choose a square and then trying to work out what to do about it.d

More importantly, I would like to make the game recognise when there’s a forced guess _coming_ — currently if there’s a 50/50 chance in one corner of the grid that you’re clearly going to have to take eventually, you have to wait until that’s _all_ there is. If you take the chance when there was a safe space available elsewhere, you’ll always lose.d

If I was feeling especially mean, I could insist that the player choose the square with the best odds of being safe, rather than simply judging whether or not each square is theoretically knowable. But I think that would be taking things too far.
