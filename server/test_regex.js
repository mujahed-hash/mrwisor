
const itemRegex = /^(.+?)\s+\$?(\d+\.\d{2})\s*[A-Za-z]?\s*$/;
const inputs = [
    "Milk 3.99",
    "Eggs $12.50",
    "Bread 2.00 T",
    "Candy 1.50   ",
    "Invalid Line",
    "SUBTOTAL 20.00"
];

console.log("Testing Regex...");
inputs.forEach(input => {
    const match = input.match(itemRegex);
    if (match) {
        console.log(`MATCH: "${match[1]}" - ${match[2]}`);
    } else {
        console.log(`NO MATCH: ${input}`);
    }
});
