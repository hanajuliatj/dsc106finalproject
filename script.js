// Load the CSV file
d3.csv("preprocessed_data.csv").then(function(data) {
    // Parse timestamps and convert numeric values
    data.forEach(d => {
        d.timestamp = new Date(d.timestamp);  // Convert to Date object
        d.value_hr = +d.value_hr;             // Convert to number
        d.value_eda = +d.value_eda;           // Convert to number
        d.temp = +d.temp;                     // Convert to number
    });

    console.log(data); // Check if data loads correctly

    // Call the function to create the timeline visualization
    createTimelineExplorer(data);
    createWhatIfSimulator(data);

});

function createTimelineExplorer(data) {
    const margin = { top: 50, right: 50, bottom: 50, left: 80 };
    const width = 900 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Append SVG canvas
    const svg = d3.select("#timeline")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Set up scales
    const xScale = d3.scaleTime()
        .domain(d3.extent(data, d => d.timestamp))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([d3.min(data, d => Math.min(d.value_hr, d.value_eda, d.temp)),
                 d3.max(data, d => Math.max(d.value_hr, d.value_eda, d.temp))])
        .range([height, 0]);

    // Create X & Y Axes
    const xAxis = d3.axisBottom(xScale).ticks(10);
    const yAxis = d3.axisLeft(yScale).ticks(6);
    // Add zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([1, 10])  // Set zoom limits (1x to 10x zoom)
        .translateExtent([[0, 0], [width, height]])  // Restrict panning to chart bounds
        .on("zoom", zoomed);

    svg.call(zoom);

    // Zoom handler function
    function zoomed(event) {
        const newXScale = event.transform.rescaleX(xScale);
        svg.selectAll("path").attr("d", d3.line()
            .x(d => newXScale(d.timestamp))
            .y(d => yScale(d.value_hr))
            .curve(d3.curveMonotoneX)
        );

        svg.select(".x-axis").call(d3.axisBottom(newXScale));
    }

    // Define brush behavior
    const brush = d3.brushX()
        .extent([[0, 0], [width, height]])
        .on("end", brushed);

    svg.append("g")
        .attr("class", "brush")
        .call(brush);

    // Brush handler function
    function brushed(event) {
        if (!event.selection) return; // Exit if no selection

        const [x0, x1] = event.selection.map(xScale.invert); // Convert pixel values to timestamps

        // Filter data within selected range
        const filteredData = data.filter(d => d.timestamp >= x0 && d.timestamp <= x1);

        // Update chart with new data
        updateChart(filteredData);
    }

// Function to update chart when brush is applied
    function updateChart(filteredData) {
        svg.selectAll("path")
            .datum(filteredData)
            .attr("d", d3.line()
                .x(d => xScale(d.timestamp))
                .y(d => yScale(d.value_hr))
                .curve(d3.curveMonotoneX)
            );

        svg.select(".x-axis")
            .call(d3.axisBottom(xScale).scale(d3.scaleTime().domain(d3.extent(filteredData, d => d.timestamp)).range([0, width])));
    }

    function resetZoom() {
        svg.transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity);
    }
    



    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis);

    svg.append("g")
        .call(yAxis);

    // Define line generators
    const lineHR = d3.line()
        .x(d => xScale(d.timestamp))
        .y(d => yScale(d.value_hr))
        .curve(d3.curveMonotoneX);  // Smooth line

    const lineEDA = d3.line()
        .x(d => xScale(d.timestamp))
        .y(d => yScale(d.value_eda))
        .curve(d3.curveMonotoneX);

    const lineTemp = d3.line()
        .x(d => xScale(d.timestamp))
        .y(d => yScale(d.temp))
        .curve(d3.curveMonotoneX);
    // Create a tooltip div (hidden by default)
    const tooltip = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.8)")
        .style("color", "#fff")
        .style("padding", "8px")
        .style("border-radius", "5px")
        .style("font-size", "12px")
        .style("display", "none");

// Append circles to each data point for tooltip interaction
    ["value_hr", "value_eda", "temp"].forEach((key, i) => {
        svg.selectAll(`.dot-${key}`)
            .data(data)
            .enter()
            .append("circle")
            .attr("class", `dot-${key}`)
            .attr("cx", d => xScale(d.timestamp))
            .attr("cy", d => yScale(d[key]))
            .attr("r", 4)
            .attr("fill", i === 0 ? "red" : i === 1 ? "blue" : "green")
            .attr("opacity", 0.8)
            .on("mouseover", function(event, d) {
                tooltip.style("display", "block")
                    .html(
                        `<strong>Time:</strong> ${d.timestamp.toLocaleTimeString()}<br>
                        <strong>HR:</strong> ${d.value_hr.toFixed(2)} BPM<br>
                        <strong>EDA:</strong> ${d.value_eda.toFixed(2)} µS<br>
                        <strong>Temp:</strong> ${d.temp.toFixed(2)}°C`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", () => tooltip.style("display", "none"));
    });


    // Draw the HR line
    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("d", lineHR);

    // Draw the EDA line
    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "blue")
        .attr("stroke-width", 2)
        .attr("d", lineEDA);

    // Draw the Temp line
    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "green")
        .attr("stroke-width", 2)
        .attr("d", lineTemp);

    // Add labels
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text("Heart Rate, EDA & Temperature Over Time");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .text("Time");

    svg.append("text")
        .attr("x", -height / 2)
        .attr("y", -50)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .text("Sensor Readings");
}

function createWhatIfSimulator(data) {
    const margin = { top: 50, right: 50, bottom: 50, left: 80 };
    const width = 900 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Append SVG canvas
    const svg = d3.select("#simulator-chart")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Set up scales
    const xScale = d3.scaleLinear().domain([0, 10]).range([0, width]);  // Scale for stress/exercise levels
    const yScale = d3.scaleLinear().domain([
        d3.min(data, d => Math.min(d.value_hr, d.value_eda, d.temp)),
        d3.max(data, d => Math.max(d.value_hr, d.value_eda, d.temp))
    ]).range([height, 0]);

    // Create axes
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).ticks(10));

    svg.append("g")
        .call(d3.axisLeft(yScale));

    // Line generators for HR, Temp, and EDA
    const lineHR = d3.line()
        .x(d => xScale(d.stress))
        .y(d => yScale(d.value_hr))
        .curve(d3.curveMonotoneX);

    const lineEDA = d3.line()
        .x(d => xScale(d.stress))
        .y(d => yScale(d.value_eda))
        .curve(d3.curveMonotoneX);

    const lineTemp = d3.line()
        .x(d => xScale(d.stress))
        .y(d => yScale(d.temp))
        .curve(d3.curveMonotoneX);

    // Initial data points for dynamic update
    let simulatedData = d3.range(11).map(i => ({
        stress: i,
        value_hr: 60 + i * 2,  // Sample formula for HR increase
        value_eda: 0.5 + i * 0.1,  // Sample formula for EDA increase
        temp: 36 + i * 0.05  // Sample formula for Temp increase
    }));

    // Draw the initial HR, EDA, and Temp lines
    const hrLine = svg.append("path")
        .datum(simulatedData)
        .attr("fill", "none")
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("d", lineHR);

    const edaLine = svg.append("path")
        .datum(simulatedData)
        .attr("fill", "none")
        .attr("stroke", "blue")
        .attr("stroke-width", 2)
        .attr("d", lineEDA);

    const tempLine = svg.append("path")
        .datum(simulatedData)
        .attr("fill", "none")
        .attr("stroke", "green")
        .attr("stroke-width", 2)
        .attr("d", lineTemp);

    // Function to update predictions based on slider values
    function updateSimulation() {
        const stressLevel = parseFloat(d3.select("#stress-slider").property("value"));
        const exerciseIntensity = parseFloat(d3.select("#exercise-slider").property("value"));

        // Display selected values
        d3.select("#stress-value").text(stressLevel);
        d3.select("#exercise-value").text(exerciseIntensity);

        // Generate new simulated data
        simulatedData = d3.range(11).map(i => ({
            stress: i,
            value_hr: 60 + stressLevel * 2 + exerciseIntensity * 1.5,  // HR formula
            value_eda: 0.5 + stressLevel * 0.1 + exerciseIntensity * 0.05,  // EDA formula
            temp: 36 + stressLevel * 0.05 + exerciseIntensity * 0.02  // Temp formula
        }));

        // Update lines
        hrLine.datum(simulatedData).transition().duration(500).attr("d", lineHR);
        edaLine.datum(simulatedData).transition().duration(500).attr("d", lineEDA);
        tempLine.datum(simulatedData).transition().duration(500).attr("d", lineTemp);
    }

    // Attach event listeners to sliders
    d3.select("#stress-slider").on("input", updateSimulation);
    d3.select("#exercise-slider").on("input", updateSimulation);
}
