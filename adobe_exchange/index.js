var cors = require('cors')
const express = require('express')
const app = express()
const port = 3000

app.use(cors())

const cards = require('./cards/exchange_cards.json').cards;
const SLURI = require('sluri');

function filterByFree(cards){
	return cards.filter(function(card){
		return card.extensionPrice === "Free"
	})
}

function filterByNotFree(cards){
	return cards.filter(function(card){
		return card.extensionPrice !== "Free"
	})
}

function filterByTagId(cards, tagId) {
	var tagId = tagId.toLowerCase();

	var match = function(tag){
  		// checks whether an element is a match
  		return tag.includes(tagId);
	};

	return cards.filter(function(card){
		let cardTags= card.tags.map(tag => tag.toLowerCase());
		return cardTags.some(match);
	})
}


function cleanUpPriceInput(price){
	if(price === "Free"){
		return 0;
	}

	if(price.includes("$")){
		return price.split("$")[1];
	}

	return price;
}

function sortByRating(cards){
	return cards.sort(function(itemOne, itemTwo){
		return itemTwo.extensionRating - itemOne.extensionRating;
	})
}

function sortByTitle(cards){
	return cards.sort(function(itemOne, itemTwo){
		return (itemOne.extensionTitle).localeCompare(itemTwo.extensionTitle);
	})
}

function sortByPriceAsc(cards){
	return cards.sort(function(itemOne, itemTwo){
		let priceTwo = parseInt(cleanUpPriceInput(itemTwo.extensionPrice));
		let priceOne = parseInt(cleanUpPriceInput(itemOne.extensionPrice));

		return priceTwo - priceOne;
	})
}


function sortByPriceDesc(cards){
	return cards.sort(function(itemOne, itemTwo){
		let priceTwo = parseInt(cleanUpPriceInput(itemTwo.extensionPrice));
		let priceOne = parseInt(cleanUpPriceInput(itemOne.extensionPrice));

		return priceOne - priceTwo;
	})
}

function sortByPopular(cards){

	function shuffle(array) {
	  var currentIndex = array.length, temporaryValue, randomIndex;

	  // While there remain elements to shuffle...
	  while (0 !== currentIndex) {

	    // Pick a remaining element...
	    randomIndex = Math.floor(Math.random() * currentIndex);
	    currentIndex -= 1;

	    // And swap it with the current element.
	    temporaryValue = array[currentIndex];
	    array[currentIndex] = array[randomIndex];
	    array[randomIndex] = temporaryValue;
	  }

	  return array;
	}

	return shuffle(cards);
}

function sortByRecent(cards){
	return cards.reverse();
}

function getSuffix(req){
	var suffix = {
		sortType: req.params.sortType,
		resultsPerPage: req.params.resultsPerPage,
		pageNumber: req.params.pageNumber,
		tags: req.params["0"] || []
	}
	return suffix;
}

function paginateCards(array, page_size, page_number) {
	--page_number; // because pages logically start with 1, but technically with 0
	return array.slice(page_number * page_size, (page_number + 1) * page_size);
}

function getSort(req){
	var suffix = getSuffix(req);
	return suffix.sortType;
}

function getPageNumber(req){
	var suffix = getSuffix(req);
	return parseInt(suffix.pageNumber);
}

function getPageSize(req){
	var suffix = getSuffix(req);
	return parseInt(suffix.resultsPerPage);
}

function getTotalPages(total_items, limit){
	return Math.ceil(total_items/limit);
}

function getFilterTags(req){
	var tags = getSuffix(req).tags;
	if(tags.length === 0){
		return [];
	}
	else {
		return tags.split("/products/");
	}
}

function getFilteredCards(filterTags){
	let filteredCards = cards;

	for(var i = 0; i < filterTags.length; i++){
		filteredCards = filterByTagId(filteredCards, filterTags[i]);
	}

	return filteredCards;
}

function getSortedCards(cards, sort){
	if(sort === 'rating'){
		return sortByRating(cards);
	}
	if(sort === 'recent'){
		return sortByRecent(cards);
	}

	if(sort === 'popular'){
		return sortByPopular(cards);
	}

	if(sort === 'title'){
		console.log('title');
		return sortByTitle(cards);
	}

	if(sort === 'priceDesc'){
		return sortByPriceDesc(cards);
	}

	if(sort === 'priceAsc'){
		return sortByPriceAsc(cards);
	}
	return cards;
}


function getRequestParameters(req){
	return {
		sort: getSort(req),
		pageNumber: getPageNumber(req),
		pageSize: getPageSize(req),
		filterTags: getFilterTags(req)
	}
}

function handleRequest(req){
	let requestParameters = getRequestParameters(req);

	let filteredCards = getFilteredCards(requestParameters.filterTags);
	let sortedCards = getSortedCards(filteredCards, requestParameters.sort);
	let paginatedCards = paginateCards(sortedCards, requestParameters.pageSize, requestParameters.pageNumber)

	let response = {
		"page": getPageNumber(req),
   		"totalPages": getTotalPages(filteredCards.length, getPageSize(req)),
   		"totalResults": filteredCards.length,
   		"sort": requestParameters.sort,
   		"cards": paginatedCards,
   		"tags": {}
	}

	return response;
}

app.get('/content/www/us/en/insights.collectionx.json/sort-:sortType/(*)/results-:resultsPerPage.:pageNumber.json', function(req, res){
	let response = handleRequest(req);
	res.setHeader('Content-Type', 'application/json');
	res.send(response);
})

app.get('/content/www/us/en/insights.collectionx.json/sort-:sortType/results-:resultsPerPage.:pageNumber.json', function(req, res){
	let response = handleRequest(req);
	res.setHeader('Content-Type', 'application/json');
	res.send(response);
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))