const url = "https://api.data.netwerkdigitaalerfgoed.nl/datasets/ivo/NMVW/services/NMVW-09/sparql"
const query = `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX dc: <http://purl.org/dc/elements/1.1/>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX edm: <http://www.europeana.eu/schemas/edm/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
SELECT ?cat ?catLabel (COUNT(?cho) AS ?choCount) (SAMPLE(?afb) AS ?afbSample)
WHERE {
  # geef subtypes van ruilmiddelen
  <https://hdl.handle.net/20.500.11840/termmaster12596> skos:narrower ?cat .
  ?cat skos:prefLabel ?catLabel .
  # geef de subcategorieen van ruilmiddelen
  ?cat skos:narrower* ?type .
  # geef objecten bij de onderliggende types
  ?cho edm:object ?type . 
  ?cho edm:isShownBy ?afb .
} GROUP BY ?cat ?catLabel
`

function Ruilmiddelperland() {
	fetch(url + "?query=" + encodeURIComponent(query) + "&format=json") //omzetten naar json en geschikt maken voor de het ophalen uit browser
		.then(data => data.json())
		.then(json => {
			const newResults = json.results.bindings
				.map(result => {
					return {
						category: result.catLabel.value,
						value: Number(result.choCount.value),
						foto: result.afbSample.value
					}
				})
				//console.log(foto)
			bouwViz(newResults)
		})
}

Ruilmiddelperland()

function bouwViz(results) {
	const svg = d3.select('svg');
	//hoe breed en hoe hoog wordt de visualisatie?
	const margin = 80;
	//const margintop = 35;
	//const marginleft = 50;
	const width = 1000 - 2 * margin;
	const height = 600 - 2 * margin;

	const chart = svg.append('g')
		.attr('transform', `translate(${margin}, ${margin})`);

	//x-as schaal
	const xScale = d3.scaleBand()
		.range([0, width])
		.domain(results.map((s) => s.category))
		.padding(0.4)

	//console.log(results);
	//console.log(results.map((s) => s.category));

	//y-as schaal
	const yScale = d3.scaleLinear()
		.range([height, 0])
		.domain([0, 240]);

	const makeYLines = () => d3.axisLeft()
		.scale(yScale)

	// Nieuwe groep, horizontale lijn x-as tekenen
	chart.append('g')
		.attr('transform', `translate(0, ${height})`)
		.call(d3.axisBottom(xScale));

	// Nieuwe groep, verticale lijn y-as tekenen
	chart.append('g')
		.call(d3.axisLeft(yScale));

	//grid maken op achtergrond bar chart
	chart.append('g')
		.attr('class', 'grid')
		.call(makeYLines()
			.tickSize(-width, 0, 0)
			.tickFormat('')
		)
	// data aanroepen, versturen en groeperen
	const categoryBar = chart.selectAll()
		.data(results)
		.enter()
		.append('g')

	console.log(results)

	categoryBar
		.append('rect')
		.attr('class', 'bar')
		.attr('x', (g) => xScale(g.category))
		.attr('y', (g) => yScale(g.value))
		.attr('height', (g) => height - yScale(g.value))
		.attr('width', xScale.bandwidth())
		//hover loslaten , geen opacity

		.on('mouseenter', function (actual, i, category) {
			d3.selectAll('.value')
				.attr('opacity', 0) //weghalen van de bar

			d3.select(this)
				.transition()
				.duration(300)
				.attr('opacity', 0.6) //terugzetten van de bar transparant
				.attr('x', (a) => xScale(a.category) - 5)
				.attr('width', xScale.bandwidth() + 10)

			const y = yScale(actual.value)
			//nieuwe code
			const x = xScale(category.x0) +
				(xScale(category.x1) - xScale(category.x0)) / 2 +
				width.marginleft
			const yas = yScale(yScale(category)) +
				height.margintop
			const tooltip = d3.select("#tooltip")
			tooltip
				.style("opacity", 1)
				.style("left", d3.event.pageX - actual.value)
				.style("top", d3.event.pageY - actual.value)
				.style("transform", `translate(${x}px,${yas}px)`)
			// .style('transform', `translate(${marginleft}, ${margintop})`);


			tooltip
				.select("#range")
				//.html( "<img src=(actual.foto)/>")
				.html([ //<img src="(actual.foto)" /> +  
					//("img src= ${actual.foto}") +
					 (actual.category + "<img src=" + actual.foto + " width= 100px; height= 100px />") +
					 (actual.category) + (actual.value) 
				].join(" ")) //waardes meegeven aan de tooltip
				//.style("foto: transform", `translate(${x}px,${yas}px)`))
				//.style('transform', `translate(${marginleft}, ${margintop})`);
			tooltip
				// .attr('id', 'range')
				// .attr('x1', 0)
				// .attr('y1', y)
				// .attr('x2', width)
				// .attr('y2', y)
				.style("transform", `translate(` +
					`calc( -50% + ${xScale}px),` +
					`calc(-100% + ${yScale}px)` +
					`)`)
				// .attr("height", function(d) {       
				// 	//return y(d.y0) - y(d.y1); //heights calculated based on stacked values (inaccurate)
				// 	return y(0) - y(d .value); //calculate height directly from value in csv file
				// })


			// LIJN BOVEN DE BAR CHARTS VOOR EEN DUIDELIJK OVERZICHT

				line = chart.append('line')
				.attr('id', 'limit')
				.attr('x1', 0)
				.attr('y1', y)
				.attr('x2', width)
				.attr('y2', y)				

		})
		//hover loslaten , geen opacity
		.on('mouseleave', function () {

			d3.selectAll('.value')
				.attr('opacity', 1)

			d3.select(this)
				.transition()
				.duration(300)
				.attr('opacity', 1)
				.attr('x', (a) => xScale(a.category))
				.attr('width', xScale.bandwidth())

			chart.selectAll('#limit').remove()

			const tooltip = d3.select("#tooltip")
			tooltip
				.style("opacity", 0)
		})

	categoryBar
		.append('text')
		.attr('x', (a) => xScale(a.category) + xScale.bandwidth() / 2)
		.attr('y', (a) => yScale(a.value) + 40)
		.attr('text-anchor', 'middle')
		.text((a) => `${a.value}`)

	svg
		.append('text')
		.attr('class', 'label')
		.attr('x', -(height / 2) - margin)
		.attr('y', margin / 2.4)
		.attr('transform', 'rotate(-90)')
		.attr('text-anchor', 'middle')
		.text('Aantal ruilmiddelen')

	svg.append('text')
		.attr('class', 'label')
		.attr('x', width / 2 + margin)
		.attr('y', height + margin * 1.7)
		.attr('text-anchor', 'middle')
		.text('categorie')

	svg.append('text')
		.attr('class', 'title')
		.attr('x', width / 2 + margin)
		.attr('y', 40)
		.attr('text-anchor', 'middle')
		.text('Uit welke ruilmiddelen bestaat de collectie van het NMWC?')


	
	function stream_waves(n, m) {
		return d3.range(n).map(function (i) {
			return d3.range(m).map(function (j) {
				var x = 20 * j / m - i / 3;
				return 2 * x * Math.exp(-.5 * x);
			}).map(stream_index);
		});
	}

	// function stream_index(d, i) {
	// 	return {
	// 		x: i,
	// 		y: Math.max(0, d)
	// 	};
	// }

	// var myChart;
	// var chart;

	// nv.addGraph(function () {
	// 	chart = nv.models.multiBarChart();

	// 	chart.xAxis
	// 		.tickFormat(d3.format(',f'));

	// 	chart.yAxis
	// 		.tickFormat(d3.format(',.1f'));

	// 	chart.multibar.stacked(true); // default to stacked
	// 	chart.showControls(false); // don't show controls

	// 	// on legend click, re-apply onclick events
	// 	chart.dispatch.on('renderEnd', function () {
	// 		d3.selectAll(".nv-bar").on('click',
	// 			function () {
	// 				updateMyChart()
	// 			});
	// 	});

	// 	myChart = d3.select('#chart svg');

	// 	myChart.datum(data())
	// 		.transition().duration(500).call(chart);

	// 	nv.utils.windowResize(chart.update);

	// 	return chart;
	// }, function () {
	// 	d3.selectAll(".nv-bar").on('click',
	// 		function () {

	// 			updateMyChart()

	// 		});
	// });

	// function updateMyChart() {
	// 	myChart.datum(data()).transition().duration(1000).call(chart);
	// 	myChart.selectAll(".nv-bar").on('click',
	// 		function () {

	// 			updateMyChart()

	// 		});
	// 	nv.utils.windowResize(myChart.update);
	// }



}