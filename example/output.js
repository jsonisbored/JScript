const asdf = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const [one] = asdf;
const aocw = Array(asdf[1]+1-one).fill(0).map((_, i) => i+one);
