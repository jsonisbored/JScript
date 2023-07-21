

console.log(NewsArticle({
    content: "BREAKING NEWS!",
}).to_string());

switch (result) {
    case Option.Some(val): 
        console.log(val);
    case Option.None: 
        console.log("none");
};

