// TODO: Add something about temperature?

let seed = Math.round(Math.random() * 1024)
let rng = new Math.seedrandom(seed)
console.log("seed:", seed)

// let simplex = new SimplexNoise(seed.toString())
// //let value = simplex.noise2D(x,y)

/////////////////////////////////////////////////////////////////////
///////////////////////////// Constants /////////////////////////////
/////////////////////////////////////////////////////////////////////
const PI = Math.PI
const TAU = PI * 2

let DEFAULT_WIDTH = 2 * 1748 //2 * 148mm
let DEFAULT_HEIGHT = 2480 //210mm

let cos = Math.cos
let sin = Math.sin

// Data
let data, dataEU, dataNA
let numID, numEU, numNA
let citiesNA, citiesEU
let unique_cities
let OFFSET_NA

///////////////////////// Read in the fonts /////////////////////////

const FONT_FAMILY = "Atkinson Hyperlegible" //"Noway"
const FONT_FAMILY_NUMBERS = FONT_FAMILY //"Izoard"
const FONT_FAMILY_TITLE = "Almendra Display"

document.fonts.load(`normal 400 10px "${FONT_FAMILY_NUMBERS}"`)
document.fonts.load(`normal 400 10px "${FONT_FAMILY_TITLE}"`)

// document.fonts.load(`normal 100 10px "${FONT_FAMILY}"`)
// document.fonts.load(`normal 300 10px "${FONT_FAMILY}"`)
document.fonts.load(`normal 400 10px "${FONT_FAMILY}"`)
document.fonts.load(`italic 400 10px "${FONT_FAMILY}"`)
// document.fonts.load(`normal 500 10px "${FONT_FAMILY}"`)
document.fonts.load(`normal 700 10px "${FONT_FAMILY}"`)

/////////////////////////////////////////////////////////////////////
/////////////////////////// Create Canvas ///////////////////////////
/////////////////////////////////////////////////////////////////////

// const canvas_background = document.getElementById("canvas-background")
// const context_background = canvas_background.getContext("2d")

const canvas2D = document.getElementById("canvas-2D")
const context = canvas2D.getContext("2d")

const canvas_texture = document.createElement("canvas")
const context_texture = canvas_texture.getContext("2d")
//Set the style of display to none
canvas_texture.style.display = "none"

const PIXEL_RATIO = window.devicePixelRatio
const WIDTH = DEFAULT_WIDTH * 3/2
const HEIGHT = DEFAULT_HEIGHT * 3/2
const MARGIN = { top: HEIGHT * 0.08, right: WIDTH * 0.09, bottom: HEIGHT * 0.055, left: WIDTH * 0.08 }
const w = WIDTH / 2 - MARGIN.left - MARGIN.right
const h = HEIGHT - MARGIN.top - MARGIN.bottom
const ASP = DEFAULT_WIDTH / DEFAULT_HEIGHT

// Set the scale factor - I don't think I'm actually using this 
const SF = WIDTH / DEFAULT_WIDTH

// setSize(canvas_background)
setSize(canvas2D)
setSize(canvas_texture)

function setSize(canvas) {
    const screen_width = window.innerWidth - 2 * 40
    // const screen_width = Math.min(window.innerWidth - 2 * 40, DEFAULT_WIDTH / 2)
    canvas.width = WIDTH
    canvas.height = HEIGHT
    canvas.style.width = `${screen_width}px`
    canvas.style.height = `${screen_width / ASP}px`

}// function setSize

// Add resize function
window.addEventListener("resize", () => {
    const screen_width = Math.round(Math.min(window.innerWidth - 2 * 40, WIDTH / 2))
    canvas2D.style.width = `${screen_width}px`
    canvas2D.style.height = `${screen_width / ASP}px`
})

/////////////////////////////////////////////////////////////////////
/////////////////////////////// Colors //////////////////////////////
/////////////////////////////////////////////////////////////////////

const COLOR_BACKGROUND = "#fbfdfd"
const COLOR_TEXT_TITLE = "#0c8de4"
const COLOR_TEXT = "#0077C5" // "#065493"
// const COLOR_TEXT = "#25211d"
const COLOR_SUB_TEXT = "#49b0e4"
const COLOR_LINES = "#cdddef"

// ["#FFBA4E", "#f50092", "#008DEE", "rgb(0, 210, 171)", "#FF6765", "#4F35D1"]

/////////////////////////////////////////////////////////////////////
////////////////////////// Create Functions /////////////////////////
/////////////////////////////////////////////////////////////////////

let parseDate = d3.timeParse("%Y-%m-%d")

/////////////////////////////////////////////////////////////////////
/////////////////////////// Create Scales ///////////////////////////
/////////////////////////////////////////////////////////////////////

// X-axis
const scale_time = d3.scaleLinear()
    .domain([1973, 2022])
    .range([0, w])

// Y-axis
const scale_y = d3.scaleLinear()
    .range([0, h])

// I think the data with precipitation above 40mm is wrong (after some manual checking)
// Size of the snowflakes
const scale_precip = d3.scaleSqrt()
    .domain([0, 40])
    .range([2, 60])

// Latitude line on the right
const line_top = 0
const line_bottom = h
const line_x = w + MARGIN.left * 0.6 + 0.5

const scale_latitude = d3.scaleLinear()
    .domain([35, 65])
    .range([line_bottom, line_top])

/////////////////////////////////////////////////////////////////////
///////////////////////// Snowflake Texture /////////////////////////
/////////////////////////////////////////////////////////////////////

// Fill the canvas with hundreds of circles of varying color and size, positioned randomly
// Used as a "texture" for the snowflakes
let points_texture = []
for (let i = 0; i < 20000; i++) {
    let x = rangeFloor(WIDTH)
    let y = rangeFloor(HEIGHT)
    let r = rangeFloor(2, 50) * SF
    let color = `hsla(${rangeFloor(180,230)}, 100%, ${rangeFloor(60, 80)}%, ${range(0.1, 0.9)})`
    points_texture.push({x, y, r, color})
}// for i

// drawTexturePoints()
function drawTexturePoints() {
    context_texture.fillStyle = COLOR_BACKGROUND
    context_texture.fillRect(0, 0, WIDTH, HEIGHT)

    points_texture.forEach(d => {
        context_texture.fillStyle = d.color
        context_texture.beginPath()
        context_texture.arc(d.x, d.y, d.r, 0, TAU)
        context_texture.fill()
    })// forEach
}// function drawTexturePoints

// TEST - Add to the body 
// document.body.appendChild(canvas_texture)

/////////////////////////////////////////////////////////////////////
///////////////////////////// Read Data /////////////////////////////
/////////////////////////////////////////////////////////////////////

document.fonts.ready.then(() => {
    d3.csv(`data/weather_data.csv`).then(dataRAW => {
        //////////////////////// Prepare Data ///////////////////////
        data = prepareData(dataRAW)

        // Precalculate the grid positions of each year+location
        citiesNA = unique_cities.filter(d => d.longitude < -25)
        citiesEU = unique_cities.filter(d => d.longitude >= -25)
        determineGridPosition(dataNA, citiesNA, numNA, OFFSET_NA)
        determineGridPosition(dataEU, citiesEU, numEU)
        
        ///////////////// Draw the Static Background /////////////////
        drawBackground(context)
        drawIntroText(context)
        drawChartGrid(context)
        drawCredits(context)

        ///////////////// Prepare the "texture" for the snowflakes //////////////////
        points_texture.forEach(d => {
            d.x_base = d.x
            d.y_base = d.y
            d.simplex_offset = [rangeFloor(0, 1000), rangeFloor(0, 1000)]
        })// forEach
        drawTexturePoints()

        //////////////////// Draw the Snowflakes /////////////////////
        drawSnowflakeGrid(context)
        // Legend marks 
        drawLegend(context)

        // ///////////////// Animate the Snowflakes /////////////////////
        // let counter = 0
        // function animate() {

        //     // // Update the positions of the points_texture a little using the simplex noise
        //     // const FREQ = 0.5
        //     // const AMP = 100
        //     // points_texture.forEach((d,i) => {
        //     //     let a = mod((counter / 1000) * TAU, TAU)
        //     //     d.x = d.x_base + simplex.noise2D(FREQ * cos(a) + d.simplex_offset[0], FREQ * sin(a) + d.simplex_offset[0]) * AMP
        //     //     d.y = d.y_base + simplex.noise2D(FREQ * cos(a) + d.simplex_offset[1], FREQ * sin(a) + d.simplex_offset[1]) * AMP
        //     // })// forEach

        //     counter++
        //     requestAnimationFrame(animate)
        // }// function animate
        // // animate()

        /////////////////////////////////////////////////////////////
        // // Now that the 2D canvas is drawn, load the 3D canvas
        // let script = document.createElement('script')
        // script.src = 'js/script-canvas3D.js'
        // script.type = 'module'
        // document.body.appendChild(script)
        // console.log("Loaded 3D script")

    })//d3.csv
})//fonts.ready

/////////////////////////////////////////////////////////////////////
////////////////////////// Data Preparation /////////////////////////
/////////////////////////////////////////////////////////////////////
function prepareData(dataRAW) {
    let data = dataRAW
    
    data.forEach(d => {
        d.id = +d.id

        d.tempmin = +d.tempmin
        d.tempmax = +d.tempmax
        d.temp = +d.temp
        d.feelslikemin = +d.feelslikemin
        d.feelslikemax = +d.feelslikemax
        d.feelslike = +d.feelslike

        // If the difference between temp and tempmax and temp and tempmin is too large, then the data is probably wrong
        let diff_tempmax = Math.abs(d.tempmax - d.temp)
        let diff_tempmin = Math.abs(d.tempmin - d.temp)
        if(Math.abs(diff_tempmax - diff_tempmin) > 10) d.wrong_temp_data = true
        
        d.cloudcover = +d.cloudcover
        d.precip = +d.precip
        d.snow = +d.snow
        d.snowdepth = +d.snowdepth

        d.latitude = +d.latitude
        d.longitude = +d.longitude
        // For the cities with a county of USA, take the text between the () out of the city and add to the country
        if(d.country === "USA") {
            let index = d.city.indexOf("(")
            if(index > -1) {
                d.country = `${d.city.slice(index+1, -1)} | US`
                d.city = d.city.slice(0, index-1)
            }//if
        }//if
        d.location = `${d.city} / ${d.country}`

        d.date = parseDate(d.datetime)
        d.year = d.date.getFullYear()
    })
    console.log(data[0])

    // Filter out some cities
    data = data.filter(d => ["Thimphu","Kathmandu"].indexOf(d.city) === -1)

    // Filter out all the years before 1972
    // data = data.filter(d => d.year > 1972)

    numID = new Set(data.map(d => d.id)).size
    unique_cities = data.filter((_, i) => i < numID) // To get a unique set of one for each city
    // console.log(numID, unique_cities)

    // Order the data by their latitude and then id, and then by date 
    data.sort((a, b) => b.latitude - a.latitude || a.id - b.id || a.date - b.date)

    // Split the dataset into a set for North America and one for Europe+Asia
    dataNA = data.filter(d => d.longitude < -25)
    dataEU = data.filter(d => d.longitude >= -25)

    // Get the number of unique id's in each dataset
    numEU = new Set(dataEU.map(d => d.id)).size
    numNA = new Set(dataNA.map(d => d.id)).size

    OFFSET_NA = (numEU - numNA) * (h / (numEU-1))

    // Set the domain of the scales
    scale_y.domain([0, numEU-1])
    // scale_latitude.domain([d3.min(data, d => d.latitude), d3.max(data, d => d.latitude)])

    return data
}// function prepareData

function determineGridPosition(data, cities, N, offset = 0) {
    cities.forEach((d,i) => {
        d.label_x = -30 * SF
        d.label_y = scale_y(i) + offset
    })// forEach

    // Determine the grid positions
    data.forEach(d => {
        d.x = scale_time(d.year)
        // Which index in cities does this city have?
        let city_index = cities.findIndex(city => city.id === d.id)
        d.y = cities[city_index].label_y //scale_y(city_index % N) + offset
    })// forEach
}// function determineGridPosition

/////////////////////////////////////////////////////////////////////
//////////////////////// Draw the Background ////////////////////////
/////////////////////////////////////////////////////////////////////
// Draw the gradients along the background
function drawBackground(context) {
    /////////////////////////////////////////////////////////////////
    // Fill the background with a linear gradient from the top-left to the bottom-right
    let GRAD_BACKGROUND = context.createLinearGradient(0, 0, WIDTH, HEIGHT)
    GRAD_BACKGROUND.addColorStop(0, "#f9fafb")
    GRAD_BACKGROUND.addColorStop(1, "#eff5fa")
    context.fillStyle = GRAD_BACKGROUND
    // context.fillStyle = COLOR_BACKGROUND
    context.fillRect(0, 0, WIDTH, HEIGHT)

    // Below the title section
    drawWhiteRadialGradient(context, WIDTH * 0.15, HEIGHT * 0.175, WIDTH * 0.2)

    // Create radial gradients along the left and right pages around the center of the data
    drawWhiteRadialGradient(context, WIDTH * 0.25, (h-OFFSET_NA)/2 + OFFSET_NA + MARGIN.top, WIDTH * 0.25)
    drawWhiteRadialGradient(context, WIDTH * 0.75, HEIGHT * 0.375, WIDTH * 0.3)
    drawWhiteRadialGradient(context, WIDTH * 0.75, HEIGHT * 0.625, WIDTH * 0.3)

    /////////////////////////////////////////////////////////////////

    // // A gradient along the middle behind the central line
    // let GRAD_MIDDLE = context.createLinearGradient(0, 0, WIDTH, 0)
    // // GRAD_MIDDLE.addColorStop(0, "rgba(255,255,255,0)")
    // GRAD_MIDDLE.addColorStop(0.4, "rgba(236, 243, 248,0)")
    // GRAD_MIDDLE.addColorStop(0.5, "rgba(207, 224, 237, 0.2)")
    // GRAD_MIDDLE.addColorStop(0.6, "rgba(236, 243, 248,0)")
    // // GRAD_MIDDLE.addColorStop(1, "rgba(255,255,255,0)")
    // context.fillStyle = GRAD_MIDDLE
    // context.fillRect(0, 0, WIDTH, HEIGHT)

    // Draw a line through the center
    context.beginPath()
    context.moveTo(WIDTH / 2, 0 + 50 * SF)
    context.lineTo(WIDTH / 2, HEIGHT - 50 * SF)
    context.lineWidth = 2 * SF
    context.strokeStyle = "#cddfee"
    context.stroke()


}// function drawBackground

// Draw the introduction text along the top-left
function drawIntroText(context) {
    // Title
    context.save()
    context.translate(MARGIN.left - 130 * SF, MARGIN.top + 120 * SF)

        let GRAD = context.createLinearGradient(0, 0, w, 80 * SF)
        GRAD.addColorStop(0.2, "#279efc")
        GRAD.addColorStop(1, "#67e1f4")
        context.fillStyle = GRAD // COLOR_TEXT_TITLE
        context.font = `${170*SF}px ${FONT_FAMILY_TITLE}`
        context.fillText(`White Christmas`, 0, 0)
        context.font = `${50*SF}px ${FONT_FAMILY_TITLE}`
        context.fillText(`I'm dreaming of a`, 0, - 170 * SF)

        context.translate(MARGIN.left - 130 * SF, MARGIN.top + 170 * SF)
        context.font = `${90*SF}px ${FONT_FAMILY_TITLE}`
        context.fillText(`Merry Christmas!`, 480 * SF, 150 * SF)

    context.restore()

    // Draw the intro text
    context.save()
    context.translate(MARGIN.left, MARGIN.top + 220 * SF)

    context.fillStyle = COLOR_TEXT
        const fs = 28 * SF
        const lh = 44 * SF
        let text = ["Every year actually, but I don't have any memory of it ever truly snowing on Christmas Day in", "the Netherlands. And so, I turned to some historic weather data."]
        context.font = `${fs}px ${FONT_FAMILY}`
        context.textAlign = "left"
        context.textBaseline = "middle"
        context.fillText(text[0], 0, 0)
        context.fillText(text[1], 0, lh)

        text = ["I looked at some of the well-known cities in North America (left page) and the large capital", "cities in Europe and Asia (right page) that might see cold enough temperatures. How often did", "they have a white Christmas? It seems my chances in the Netherlands remain slim, but I hope", "you'll be lucky enough to get some snow on that special day of the year! "]
        for(let i = 0; i < text.length; i++) {
            context.fillText(text[i], 0, lh * (i + 3.5))
        }// for i

        // Central bold text
        context.translate(w/2, 0)
        context.font = `normal 700 ${fs}px ${FONT_FAMILY}`
        context.textAlign = "center"
        text = ["Where has it snowed on December 25th in the past 50 years? "]
        context.fillText(text[0], 0, lh * 2.25)

    context.restore()

    // Merry Christmas!
}// function drawIntroText

function drawCredits(context) {

    let text = "Data from Visual Crossing      |      Created by Nadieh Bremer      |      VisualCinnamon.com"
    context.save()
    context.translate(WIDTH, HEIGHT/2)
    context.rotate(-PI/2)
    context.fillStyle = COLOR_SUB_TEXT
    context.font = ` italic ${18*SF}px ${FONT_FAMILY}`
    context.textAlign = "center"
    context.textBaseline = "middle"
    context.globalAlpha = 0.7
    context.fillText(text, 0, -22*SF)
    context.restore()

}// function drawCredits
/////////////////////////////////////////////////////////////////////
//////////////// Draw the Static Background Elements ////////////////
/////////////////////////////////////////////////////////////////////
function drawChartGrid(context) {
    context.save()
    context.translate(MARGIN.left, MARGIN.top) // + 
        drawGridTitle(context, citiesNA, "Well-known North American Cities")
        drawGridElements(context, dataNA, citiesNA)
    context.restore()

    // Draw the right page - EurAsia
    context.save()
    context.translate(WIDTH / 2 + MARGIN.left, MARGIN.top)
        drawGridTitle(context, citiesEU, "Large EurAsian Capital Cities")
        drawGridElements(context, dataEU, citiesEU)
    context.restore()
}// function drawChartGrid

// Draw each page's grid of labels and the latitude line
function drawGridElements(context, data, cities) {
    ////////////////////// Draw the city labels /////////////////////
    drawCityLabels(context, cities)

    ////////////////////// Draw the year labels /////////////////////
    drawYearLabels(context, cities)

    //////////// Draw the temperature bar per data point ////////////
    // drawTemperatureDashOnTop(context, data)
    // drawTemperatureDash(context, data)
    // drawTemperatureBars(context, data)

    //////////////////// Draw the latitude lines ////////////////////
    drawLatitudeLine(context, cities)
}// function drawGridElements

// Draw the title above each page
function drawGridTitle(context, cities, text) {
    context.save()
    context.translate(w/2, cities[0].label_y - 100 * SF)
        // context.font = `${26*SF}px ${FONT_FAMILY}`
        context.font = `${28*SF}px ${FONT_FAMILY}`
        context.textAlign = "center"
        context.textBaseline = "middle"
        context.fillStyle = COLOR_TEXT
        context.fillText(text, 0, 0)
        // context.font = `italic ${20*SF}px ${FONT_FAMILY}`
        context.font = `italic ${23*SF}px ${FONT_FAMILY}`
        context.fillStyle = COLOR_SUB_TEXT
        context.fillText("that might get freezing temperatures on Christmas Day", 0, 30 * SF)
    context.restore()
}// function drawGridTitle

function drawCityLabels(context, cities) {
    // Draw the city and country name
    context.textAlign = "right"
    context.textBaseline = "middle"
    context.fillStyle = COLOR_TEXT
    // context.font = `${21*SF}px ${FONT_FAMILY}`
    context.font = `${22*SF}px ${FONT_FAMILY}`
    cities.forEach(d => {
        context.fillText(d.city, d.label_x, d.label_y - 0 * SF)
    })//forEach
    context.fillStyle = COLOR_SUB_TEXT
    // context.font = `italic ${16*SF}px ${FONT_FAMILY}`
    context.font = `italic ${18*SF}px ${FONT_FAMILY}`
    cities.forEach(d => {
        context.fillText(`${d.country}`, d.label_x, d.label_y + 20 * SF)
    })//forEach

    // Draw a thin line along each row
    context.strokeStyle = "#c9d0d4"//COLOR_LINES
    context.lineWidth = 1 * SF
    cities.forEach(d => {
        context.beginPath()
        context.moveTo(0, Math.round(d.label_y+0.5))
        context.lineTo(w, Math.round(d.label_y+0.5))
        context.stroke()
    })//forEach
}// function drawCityLabels

function drawYearLabels(context, cities) {
    let years = [1975,1980,1985,1990,1995,2000,2005,2010,2015,2020]

    // context.globalAlpha = 0.7
    context.font = `${19*SF}px ${FONT_FAMILY_NUMBERS}`
    context.fillStyle = COLOR_TEXT
    context.textAlign = "center"
    context.strokeStyle = "#c9d0d4"//COLOR_LINES
    context.lineWidth = 1.5 * SF
    context.setLineDash([4 * SF, 8 * SF])
    years.forEach(year => {
        context.save()
        context.translate(Math.round(scale_time(year)), h)
        
        // Draw the year
        context.fillText(`${year}`, 0, 50 * SF)

        // Draw a thin dotted line along the column
        if(year % 10 === 0) {
            context.beginPath()
            context.moveTo(0.5, 25 * SF)
            context.lineTo(0.5, cities[0].label_y-h - 25 * SF)
            context.stroke()
        }// if

        context.restore()
    })// forEach
    context.globalAlpha = 1
    context.setLineDash([])
}// function drawYearLabels

/////////////////////////////////////////////////////////////////////
////////////////////////// Draw the Legend //////////////////////////
/////////////////////////////////////////////////////////////////////
function drawLegend(context) {
    context.save()
    context.translate(MARGIN.left, MARGIN.top + OFFSET_NA - 240 * SF)
    let R = 40 * SF
    context.strokeStyle = "#5ccafa"
    context.globalCompositeOperation = "multiply"

    context.font = `italic ${23*SF}px ${FONT_FAMILY}`
    context.textAlign = "center"
    context.textBaseline = "middle"
    context.fillStyle = COLOR_SUB_TEXT
    
    // Snow snowflake
    let X = 200 * SF//w/2 - 300 * SF
    drawSixSidedFlake(context, X, 0, R * 0.525, R)
    drawSixSidedFlake(context, X, 0, R * 0.525, R, true, 4 * SF)
    context.fillText("Snow", X,  -R - 25 * SF)
    
    // Rain/Snow snowflake
    X += 175 * SF
    drawFourSidedFlake(context, X, 0, R * 0.7, R, true, 4 * SF)
    context.fillText("Rainy/Wet Snow", X,  -R - 25 * SF)
    
    X = w/2 + 200 * SF
    context.fillText("A little", X,  -R - 25 * SF)
    let r = 10 * SF
    drawSixSidedFlake(context, X, 0, r * 0.525, r)
    drawSixSidedFlake(context, X, 0, r * 0.525, r, true)

    X = w/2 + 350 * SF
    context.fillText("A lot", X,  -R - 25 * SF)
    r = 40 * SF
    drawSixSidedFlake(context, X, 0, r * 0.525, r)
    drawSixSidedFlake(context, X, 0, r * 0.525, r, true, 4 * SF)

    context.globalCompositeOperation = "source-over"

    // // Draw a line on the left page to separate the visual from the text and legend
    // context.strokeStyle = COLOR_LINES
    // context.beginPath()
    // context.moveTo(40 * SF, - 110 * SF)
    // context.lineTo(w - 40 * SF, - 110 * SF)
    // context.stroke()

    // context.beginPath()
    // context.moveTo(40 * SF, 70 * SF)
    // context.lineTo(w - 40 * SF, 70 * SF)
    // context.stroke()

    context.restore()

}// function drawLegend

/////////////////////////////////////////////////////////////////////
//////////////////////// Draw the Snowflakes ////////////////////////
/////////////////////////////////////////////////////////////////////
function drawSnowflakeGrid(context) {
    /////////////////////////////////////////////////////////////////
    // Draw the left page - North America
    context.save()
    context.translate(MARGIN.left, MARGIN.top)
        drawSnowFlakes(context, dataNA)   
    context.restore()

    // Draw the right page - EurAsia
    context.save()
    context.translate(WIDTH / 2 + MARGIN.left, MARGIN.top)
        drawSnowFlakes(context, dataEU)
    context.restore()
}// function drawSnowflakeGrid

function drawSnowFlakes(context, data) {
    // context.fillStyle = "#00bbff"
    // context.strokeStyle = "#1c89fd"
    context.strokeStyle = "#5ccafa"
    // context.strokeStyle = "#429bfa"
    // context.strokeStyle = "#008DEE"
    // context.lineWidth = 1.5 * SF
    
    context.globalCompositeOperation = "multiply"
    data.forEach(d => {
        // I don't trust the data with precipitation above 40mm
        if(d.precip > scale_precip.domain()[1]) return

        const r = scale_precip(d.precip) * SF

        const scale_thick = d3.scaleLinear()
            .domain([10, 55])
            .range([2, 5])
            .clamp(true)

        const o = scale_thick(r) * SF

        if(d.preciptype === "snow" && d.tempmin < 1.5) {
            drawSixSidedFlake(context, d.x, d.y, r * 0.525, r, false)
            drawSixSidedFlake(context, d.x, d.y, r * 0.525, r, true, o)

        } else if (d.preciptype === "rain,snow" && d.tempmin < 1.5) {
            // context.globalAlpha = 0.1
            // drawFourSidedFlake(context, d.x, d.y, r * 0.7, r, false)
            // context.globalAlpha = 1

            // context.strokeStyle = "#5ccafa"
            // drawFourSidedFlakeSimple(context, d.x, d.y, r * 0.7, r, true)
            
            drawFourSidedFlake(context, d.x, d.y, r * 0.7, r, true, Math.max(2 * SF, o*0.7))

        // } else if (d.conditions == "") { // No Data
        //     context.fillStyle = "red"
        //     context.beginPath()
        //     context.arc(d.x, d.y, 3 * SF, 0, TAU)
        //     context.fill()
        }// else if

    })// forEach
    context.globalCompositeOperation = "source-over"
}// function drawSnowFlakes

/////////////////////////////////////////////////////////////////////
///////////////////////////// Snowflakes ////////////////////////////
/////////////////////////////////////////////////////////////////////
function drawFourSidedFlakeSimple(context, x, y, w, h, do_stroke = false) {
    context.save()
    context.translate(x, y)

    context.beginPath()
    for(let i = 0; i < 4; i++) {
        context.rotate(PI/2)
        context.moveTo(0, -h * 0.1)
        context.lineTo(-w/2, -h * 0.45)
        context.lineTo(0, -h)
        context.lineTo(w/2, -h * 0.45)
        context.lineTo(0, -h * 0.1)
    }// for i
    if(!do_stroke) context.fill()
    else context.stroke()

    context.restore()
}// function drawFourSidedFlakeSimple

function drawFourSidedFlake(context, x, y, w, h, do_stroke = false, o = 2 * SF) {
    context.save()
    context.translate(x, y)

    context.beginPath()
    for(let i = 0; i < 4; i++) {
        context.rotate(PI/2)
        context.moveTo(0, -h * 0.1)
        context.lineTo(-w/2, -h * 0.45)
        context.lineTo(0, -h)
        context.lineTo(w/2, -h * 0.45)
        context.lineTo(0, -h * 0.1)

        // Create the hole
        if(do_stroke) {
            context.moveTo(0, -h * 0.1 - o)
            context.lineTo(w/2 - o*1.5, -h * 0.45)
            context.lineTo(0, -h + o)
            context.lineTo(-w/2 + o*1.5, -h * 0.45)
            context.lineTo(0, -h * 0.1 - o)
        }// if
    }// for i

    context.clip()
    context.translate(-x, -y)
    context.drawImage(canvas_texture, -MARGIN.left, -MARGIN.top, WIDTH, HEIGHT)

    context.restore()
}// function drawFourSidedFlake

function drawSixSidedFlake(context, x, y, w, h, do_stroke = false, o = 2 * SF) {
    context.save()
    context.translate(x, y)

    // let o = 2 * SF
    context.beginPath()
    for(let i = 0; i < 6; i++) {
        context.rotate(TAU/6)
        context.moveTo(0, -h * 0.075)
        context.lineTo(-w/2, -h * 0.55)
        context.lineTo(0, -h)
        context.lineTo(w/2, -h * 0.55)
        context.lineTo(0, -h * 0.075)

        // Create the hole
        if(do_stroke) {
            context.moveTo(0, -h * 0.075 - o)
            context.lineTo(w/2 - o*1.5, -h * 0.55)
            context.lineTo(0, -h + o)
            context.lineTo(-w/2 + o*1.5, -h * 0.55)
            context.lineTo(0, -h * 0.075 - o)
        }// if
    }// for i

    context.save()
    context.clip()
    context.translate(-x, -y)
    context.drawImage(canvas_texture, -MARGIN.left, -MARGIN.top, WIDTH, HEIGHT)
    context.restore()

    // Extra dash or dot
    context.beginPath()
    context.rotate(TAU/12)
    context.lineWidth = Math.max(1 * SF, Math.round(h * 0.05))
    for(let i = 0; i < 6; i++) {
        // context.moveTo(0, -h * 0.85)
        // context.arc(0, -h * 0.85, w * 0.15, 0, TAU)
        context.moveTo(0, -h * 0.75)
        context.lineTo(0, -h * 0.95)
        context.rotate(TAU/6)
    }// for i
    context.stroke()
    // context.fill()

    context.save()
    context.clip()
    context.translate(-x, -y)
    context.drawImage(canvas_texture, -MARGIN.left, -MARGIN.top, WIDTH, HEIGHT)
    context.restore()

    context.restore()
}// function drawSixSidedFlake

function drawNonPerfectFlake(context, x, y, size) {
    context.save()
    let O = 3
    context.translate(x,y)
    // context.translate(x + range(-O,O) * SF, y + range(-O,O) * SF)

    let angle = 0.15 * TAU
    context.beginPath()
    for(let i = 0; i < 6; i++) {
        context.rotate(TAU / 6)

        //Main stick
        context.moveTo(0, 0)
        context.lineTo(0, -size * range(0.95, 1.05))

        context.save()
        context.translate(0, size * 0.55)
        let r = size * 0.3
        context.moveTo(0,0)
        context.lineTo(r * cos(PI/2 - angle), r * sin(PI/2 - angle))
        context.moveTo(0,0)
        context.lineTo(r * cos(PI/2 + angle), r * sin(PI/2 + angle))
        context.restore()

        // let r = size * 0.15
        // context.moveTo(0,0)
        // context.lineTo(r * cos(PI/2 - angle), r * sin(PI/2 - angle))
        // context.moveTo(0,0)
        // context.lineTo(r * cos(PI/2 + angle), r * sin(PI/2 + angle))
        // context.restore()

        // context.save()
        // context.translate(0, size * 0.65)
        // r = size * 0.25
        // context.moveTo(0,0)
        // context.lineTo(r * cos(PI/2 - angle), r * sin(PI/2 - angle))
        // context.moveTo(0,0)
        // context.lineTo(r * cos(PI/2 + angle), r * sin(PI/2 + angle))
        
        // context.restore()

    }
    context.stroke()
    context.restore()
}// function drawNonPerfectFlake

/////////////////////////////////////////////////////////////////////
////////////////// Draw Sparkles Around Snowflakes //////////////////
/////////////////////////////////////////////////////////////////////
// function drawSparkles(context) {
//     // Clear the canvas
//     context.clearRect(0, 0, WIDTH, HEIGHT)

//     /////////////////////////////////////////////////////////////////
//     // Draw the left page - North America
//     context.save()
//     context.translate(MARGIN.left, MARGIN.top)
//         sparkles(context, dataNA)   
//     context.restore()

//     // Draw the right page - EurAsia
//     context.save()
//     context.translate(WIDTH / 2 + MARGIN.left, MARGIN.top)
//         sparkles(context, dataEU)
//     context.restore()
// }//function draw

// function sparkles(context, data) {
//     data.forEach(d => {
//         if(d.precip > scale_precip.domain()[1]) return

//         if((d.preciptype === "snow" && d.tempmin < 1.5) || (d.preciptype === "rain,snow" && d.tempmin < 1.5)) {
//             let N = range(10,20)
//             context.beginPath()
//             context.fillStyle = "#1155bb"
//             for(let j = 0; j < N; j++) {
//                 // Draw little dots around the snowflakes
//                 const rad = scale_precip(d.precip) * SF
//                 let r = rangeFloor(rad * 0.8, rad * 2)
//                 let a = range(0, TAU)
//                 let x = d.x + r * cos(a)
//                 let y = d.y + r * sin(a)
//                 context.moveTo(x, y)
//                 context.arc(x, y, range(0.5, 1) * SF, 0, TAU)
//             }// for j
//             context.fill()
//         }// if
//     })
// }// function sparkles

/////////////////////////////////////////////////////////////////////
//////////////////////////// Temperatures ///////////////////////////
/////////////////////////////////////////////////////////////////////
function drawTemperatureBars(context, data) {
    context.globalCompositeOperation = "multiply"
    const scale_height = d3.scaleLinear()
        .domain([-40, 40])
        .range([-40 * SF, 40 * SF])
    data.forEach((d,i) => {

        if(d.wrong_data) return

        const y_min = scale_height(d.tempmin)
        const y_max = scale_height(d.tempmax)
        const y_min_feel = scale_height(d.feelslikemin)
        const y_max_feel = scale_height(d.feelslikemax)

        // Create a linear gradient
        const GRAD_TEMP = context.createLinearGradient(0, 0 + scale_height.range()[0], 0, 0 + scale_height.range()[1])
        // GRAD_TEMP.addColorStop(0, "#f50092")
        // GRAD_TEMP.addColorStop(0.2, "#FF6765")
        // GRAD_TEMP.addColorStop(0.495, "#FFBA4E")
        // GRAD_TEMP.addColorStop(0.505, "rgb(0, 210, 171)")
        // GRAD_TEMP.addColorStop(0.8, "#008DEE")
        // GRAD_TEMP.addColorStop(1, "#4F35D1")

        GRAD_TEMP.addColorStop(0.49, "#f50092")
        GRAD_TEMP.addColorStop(0.51, "#0177e4")

        // GRAD_TEMP.addColorStop(0, "#f50092")
        // GRAD_TEMP.addColorStop(0.49, "#f1bcdc")
        // GRAD_TEMP.addColorStop(0.51, "#32a7f5")
        // GRAD_TEMP.addColorStop(1, "#2d4bb9")

        // GRAD_TEMP.addColorStop(0, "#f50092")
        // // GRAD_TEMP.addColorStop(0, "#c90848")
        // GRAD_TEMP.addColorStop(0.2, "#e798c7")
        // // GRAD_TEMP.addColorStop(0.2, "#FFBA4E")
        // GRAD_TEMP.addColorStop(0.495, "#ead2e0")
        // // GRAD_TEMP.addColorStop(0.495, "#feeedc")
        // GRAD_TEMP.addColorStop(0.505, "#e0ecf7")
        // GRAD_TEMP.addColorStop(0.8, "#32a7f5")
        // GRAD_TEMP.addColorStop(1, "#101370")

        context.fillStyle = GRAD_TEMP

        context.save()
        context.translate(d.x, d.y)

        let w = 6 * SF
        context.globalAlpha = 0.15
        context.fillRect(-w/2, -y_max, w, Math.max(1, Math.abs(y_min - y_max)))

        context.restore()
    })//forEach
    context.globalAlpha = 1
    context.globalCompositeOperation = "source-over"
}// function drawTemperatureBars

function drawTemperatureDash(context, data) {
    context.globalCompositeOperation = "multiply"
    context.lineWidth = 2 * SF
    const scale_height = d3.scaleLinear()
        .domain([-40, 40])
        .range([40 * SF, -40 * SF])

    data.forEach(d => {
        // if(d.wrong_temp_data) return

        if(d.temp <= 0) context.fillStyle = context.strokeStyle = "#46aafb"
        else context.fillStyle = context.strokeStyle = "#f50092"
        
        const y_temp = scale_height(d.temp)
        context.globalAlpha = 0.5
        // context.beginPath()
        // // context.moveTo(d.x - 4 *SF, d.y + y_temp)
        // // context.lineTo(d.x + 4 *SF, d.y + y_temp)
        // // context.stroke()
        // context.arc(d.x, d.y + y_temp, 2 * SF, 0, TAU)
        // context.fill()

        context.lineWidth = 2 * SF
        context.beginPath()
        context.moveTo(d.x, d.y)
        context.lineTo(d.x, d.y+y_temp)
        context.stroke()

    })//forEach
    context.globalAlpha = 1
    context.globalCompositeOperation = "source-over"
}// function drawTemperatureDash

function drawTemperatureDashOnTop(context, data) {
    // context.globalCompositeOperation = "multiply"
    context.lineWidth = 1 * SF
    const scale_height = d3.scaleLinear()
        .domain([-40, 40])
        .range([40 * SF, -40 * SF])

    context.globalAlpha = 0.3
    data.forEach(d => {
        // if(d.wrong_temp_data) return

        if(d.temp <= 0) context.fillStyle = context.strokeStyle = "#46aafb"
        else context.fillStyle = context.strokeStyle = "#f50092"
        
        const y_temp = scale_height(d.temp)
        const x = - 15 * SF
        context.beginPath()
        context.moveTo(x - 3 * SF, d.y + y_temp)
        context.lineTo(x + 3 * SF, d.y + y_temp)
        context.stroke()
        // context.arc(d.x, d.y + y_temp, 2 * SF, 0, TAU)
        // context.fill()

        // context.lineWidth = 2 * SF
        // context.beginPath()
        // context.moveTo(d.x, d.y)
        // context.lineTo(d.x, d.y+y_temp)
        // context.stroke()

    })//forEach
    context.globalAlpha = 1
    context.globalCompositeOperation = "source-over"
}// function drawTemperatureDashOnTop

/////////////////////////////////////////////////////////////////////
/////////////////////////// Latitude Line ///////////////////////////
/////////////////////////////////////////////////////////////////////
function drawLatitudeLine(context, cities) {
    // Draw the line
    context.beginPath()
    context.moveTo(line_x, line_top)
    context.lineTo(line_x, line_bottom)
    context.strokeStyle = context.fillStyle = COLOR_LINES
    context.lineWidth = 2 * SF
    context.stroke()

    // Draw the title
    context.font = `italic ${22*SF}px ${FONT_FAMILY}`
    context.textAlign = "center"
    context.textBaseline = "middle"
    context.fillStyle = COLOR_TEXT
    context.save()
    context.translate(line_x, 0)
    context.translate(0, -40 * SF)
    context.fillText(`Latitude`, 0, 0)
    context.restore()

    // Draw the degree labels
    context.font = `${20*SF}px ${FONT_FAMILY_NUMBERS}`
    context.textAlign = "left"
    const latitude_labels = d3.range(30, 66, 1)
    // const latitude_labels = [30, 35, 40, 45, 50, 55, 60, 65]
    latitude_labels.forEach(lat => {
        context.save()
        context.translate(line_x, scale_latitude(lat))

        context.fillStyle = COLOR_TEXT
        if(lat % 5 === 0) context.fillText(`${lat}°`, 22 * SF, 0)

        context.fillStyle = COLOR_LINES
        context.beginPath()
        if(lat % 5 === 0) {
            context.moveTo(7 * SF, 0.5)
            context.lineTo(17 * SF, 0.5)
            context.stroke()
        } else {
            context.arc(10 * SF, 0, 2 * SF, 0, TAU)
            context.fill()
        }// else

        context.restore()
    })//forEach

    // context.textAlign = "center"
    // latitude_labels.forEach(lat => {
    //     context.save()
    //     context.translate(line_x, scale_latitude(lat))
    //     context.rotate(degToRad(-90))
    //     context.translate(0, 20 * SF)
    //     context.fillText(`${lat}°`, 0, 0)
    //     context.restore()
    // })//forEach

    // Draw a cubic bezier curve from the end of each row to the actual latitude of the city
    context.strokeStyle = COLOR_LINES
    context.lineWidth = 2 * SF
    cities.forEach(d => {
        // Start
        let xS = w + 20 * SF
        let yS = d.y
        // End
        let xE = line_x - 20 * SF
        let yE = scale_latitude(d.latitude)
        // Control points
        let dist = (xE - xS) / 2
        let x1 = xS + dist*0.9
        let y1 = yS
        let x2 = xE - dist*0.9
        let y2 = yE

        // Draw the line
        context.beginPath()
        context.moveTo(xS, yS)
        context.bezierCurveTo(x1, y1, x2, y2, xE, yE)
        context.stroke()
    })//forEach
}// function drawLatitudeLine

/////////////////////////////////////////////////////////////////////
////////////////////////// Helper Functions /////////////////////////
/////////////////////////////////////////////////////////////////////

// Draw a radial gradient across the entire canvas at the given x and y
function drawWhiteRadialGradient(context, x, y, r) {
    let GRAD = context.createRadialGradient(x, y, 0, x, y, r)
    // Make the gradient colors more and more transparent, based off white
    GRAD.addColorStop(0.2, "rgba(255,255,255,1)")
    GRAD.addColorStop(1, "rgba(255,255,255,0)")
    context.fillStyle = GRAD
    context.fillRect(0, 0, WIDTH, HEIGHT)
}// function drawWhiteRadialGradient

function degToRad(degrees) { return degrees * PI / 180 }

function mod(x, n) { return ((x % n) + n) % n }

/////////////////////////////////////////////////////////////////////
////////////////////////// Random Functions /////////////////////////
/////////////////////////////////////////////////////////////////////

// random chance
function chance(n = 0.5) { return rng() < n }

//random change, return 1 or -1 - added by Nadieh
function sign(n = 0.5) { return rng() < n ? -1 : 1 }

// random value between min (inclusive) and max (exclusive)
function range(min, max) {
    if (min.length === 2) {
        max = min[1]
        min = min[0]
    }
    else if (max === undefined) {
        max = min
        min = 0
    }
    return rng() * (max - min) + min
}//function range

// random value between min (inclusive) and max (exclusive), then floored
function rangeFloor(min, max) { return Math.floor(range(min, max)) }

// pick a random element in the given array
function pick(array) { return array.length ? array[rangeFloor(array.length)] : undefined }

/////////////////////////////////////////////////////////////////////
////////////////////////////// Save PNG /////////////////////////////
/////////////////////////////////////////////////////////////////////

//Save as PNG on "s" and other key functions
window.onkeydown = function (e) {
    //Save at the current size
    if (e.which === 83) { //"s" key
        e.preventDefault()
        savePNG()
    }//if "s"
}//onkeydown

async function savePNG() {
    let time = new Date()
    let date_time = `${time.getFullYear()}-${pad(time.getMonth() + 1)}-${pad(time.getDate())} at ${pad(time.getHours())}.${pad(time.getMinutes())}.${pad(time.getSeconds())}`

    let download_link = document.createElement("a")
    canvas2D.toBlob(function(blob) {
        let url = URL.createObjectURL(blob)
        download_link.href = url
        download_link.download = `Snow - ${date_time}.png`
        download_link.click()
        console.log("Saved image")
    })//toBlob

    //Pad with zero's on date/time
    function pad(value) {
        if (value < 10) return '0' + value
        else return value
    }//function pad
}//savePNG

/////////////////////////////////////////////////////////////////////
////////////////////////// Not Used / Other /////////////////////////
/////////////////////////////////////////////////////////////////////

function fillHatchedCircle(context, centerX, centerY, radius, angle, lW, hatchDistance) {
    context.save()
    context.translate(centerX, centerY)
    context.rotate(angle)

    context.lineWidth = lW

    context.beginPath()
    // // Draw the circle
    // context.arc(0, 0, radius, 0, TAU)
    // context.closePath()

    // Draw the hatching lines
    for (let x = -radius*1.3; x < radius*1.3; x += hatchDistance) {
        context.moveTo(x, -Math.sqrt(radius * radius - x * x))
        context.lineTo(x, Math.sqrt(radius * radius - x * x))
    }// for x

    context.stroke()
    context.restore()
}// function fillHatchedCircle

function drawHatchedCircle() {
    // Draw a hatched circle
    const scale_lineWidth = d3.scaleLinear()
        .domain([0, 40])
        .range([1.5, 7])
    let lW = scale_lineWidth(d.precip) * SF
    let lD = lW * 2.2
    context.globalAlpha = 0.2
    fillHatchedCircle(context, d.x, d.y, r, PI * 0.2, lW, lD)
    context.globalAlpha = 1
}// function drawHatchedCircle