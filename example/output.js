const asdf = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const [one, two] = asdf;
const aocw = Array(two-one).fill(0).map((_, i) => i+one);
console.log(aocw);
