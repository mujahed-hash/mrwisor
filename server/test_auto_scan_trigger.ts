
// Since server has node-fetch removed, we can just use native fetch here too as we are on Node 22

const userId = "998dddf6-c107-432c-a335-22ea158bb169";
const groupId = "f4fae9f5-cd9b-42c1-9ccd-e302c28031d4";

// Tiny 1x1 red pixel png base64
const base64Image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

(async () => {
    console.log("Sending Test Request...");
    try {
        const response = await fetch('http://localhost:5001/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                description: "AutoScan Test " + Date.now(),
                amount: 1.23,
                currency: "USD",
                date: new Date().toISOString(),
                paidBy: userId,
                groupId: groupId,
                splitType: "EQUAL",
                receipt: base64Image
            })
        });

        const data = await response.json();
        console.log("Response Status:", response.status);
        console.log("Response Data:", data);

    } catch (e) {
        console.error("Request Failed:", e);
    }
})();
