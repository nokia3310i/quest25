'use strict'

const http = require('http')
const fs = require('fs')

http.createServer(router).listen(3000)

const docs = {
  '/': pageIndex,
  '/favicon.ico': pageFavicon,
  '/home': pageIndex,
  '/error.php': pageError,
  '/stock.php': reqStock
}

function router(req, res) {
  const url = req.url
  const doc = docs[url]

  if(!!doc) {
    doc(req, res)
  }else{
    pageError(req, res)
  }
}

let cache_stock = ''
let check = null

async function pageIndex(req, res) {
  if(!!!cache_stock) {
    cache_stock = await updateStock()
  }
  if(check === null) {
    interval('start')
  }
  // interval('stop')
  
  const file = readFile()

  const page = makePage({ file, variable: '$table', data: cache_stock })
  res.end(page)
}
function pageFavicon(req, res) {
  res.end()
}
function pageError(req, res) {
  const file = readFile()
  res.end(file)
}
async function reqStock(req, res) {
  console.info('Data was requested.')
  res.end(cache_stock.toString())
}


function makePage({ file, variable, data }) {
  return file.toString().replace(variable, data)
}
function readFile({ url = '/index.html' } = false) {
  return fs.readFileSync(`./doc${url}`)
}

const reqData = async url => {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        resolve(data)
      })
    })
    .on("error", err => reject(err))
  })
}

async function getStock(url) {
  const data_raw = await reqData(url)
  const { stock } = JSON.parse(data_raw)
  const data_filt = stock.map(el => {
    const name = el.name
    const volume = el.volume
    const amount = el.price.amount.toFixed(2)

    return {
      name,
      volume,
      amount
    }
  })
  //
  const data_table = data_filt.map(el => {
    return `
    <tr><td>${el.name}</td><td>${el.volume}</td><td>${el.amount}</td></tr>`
  }).join('').trim()

  return data_table
}

async function updateStock() {
  try {
    const stock_html = await getStock('http://phisix-api3.appspot.com/stocks.json')
    return stock_html
  }catch(err) {
    console.error(new Error(err))
    return 'Data is not available.'
  }
}

async function interval(cmd) {
  if(cmd === 'start') {
    console.log('Interval is started.')

    check = setInterval(async () => {
      try {
        const stock = await updateStock()
        cache_stock = stock
        console.info('Data updated.')
      }catch(err) {
        console.error(new Error(err))
      }
    }, 15000)
  }else{
    console.log('Interval is stopped.')

    clearInterval(check)
    check = null
  }
}