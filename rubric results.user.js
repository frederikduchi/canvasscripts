// ==UserScript==
// @name        Download rubric results
// @namespace   https://github.com/jamesjonesmath/canvancement
// @description Generates a .CSV download of the rubric results for this assignment
// @include     https://*.instructure.com/courses/*/assignments/*
// @require     https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/1.3.3/FileSaver.js
// @version     1
// @grant       none
// ==/UserScript==

(function() {
    'use strict';
    let rubricDescriptions = ` ,`;
    const resultLines = [];

    const addDownloadButton = () => {
        const $menu = document.querySelector(`.page-action-list`);
        if($menu){
            const $item = document.createElement(`li`);
            const $link = document.createElement(`a`);
            $link.setAttribute(`href`,``);
            $link.classList.add(`icon-download`);
            $link.textContent = `Download rubric results`;
            $item.appendChild($link);
            $menu.appendChild($item);
            $link.addEventListener(`click`,getRubricResults);
        }
    }

    const getRubricResults = e => {
        // get the ID's for the course and the assignment from the url
        const courseID = getID(`courses`);
        const assignmentID = getID(`assignments`);

        if(courseID == false || assignmentID == false){
            alert(`De cursus of het opdracht kon niet in het URL gevonden worden`);
            e.preventDefault();
        }

        getRubricDescription(courseID, assignmentID);
        e.preventDefault();
    }

    const getRubricDescription = (courseID, assignmentID) => {
        const url = `/api/v1/courses/${courseID}/assignments/${assignmentID}`;

        // get the rubric data for the assignment and filter the rubric descriptions
         fetch(url).then(result => result.text())
		.then(text => {
             //const rubricData = JSON.parse(text.split(`while(1);`)[1]).rubric;
             const rubricData = JSON.parse(text).rubric;
             rubricData.forEach(item => {
                 rubricDescriptions += `${item.description},`;
             });
             rubricDescriptions = rubricDescriptions.slice(0, -1);
             getStudentResults(`/api/v1/courses/${courseID}/assignments/${assignmentID}/submissions?include[]=rubric_assessment&include[]=user&page=1&per_page=100`);
         })
		.catch(reason => console.log(reason));
    }

    const getStudentResults = url => {
        let headerinfo;
        // get the student results for the rubric
         fetch(url).then(result => {
             headerinfo = result.headers.get(`Link`).split(`,`);
             return result.text()
         })
		.then(text => {
             //const submissionData = JSON.parse(text.split(`while(1);`)[1]);
             const submissionData = JSON.parse(text);
             submissionData.forEach(submission => {
                 //console.log(submission.user);
                 let line = ``;
                 const name = submission.user.sortable_name;
                 if(!submission.rubric_assessment){
                     line = addZeros(name);
                 }else{
                     line = `${name},`;
                     for(let key in submission.rubric_assessment){
                         const point = submission.rubric_assessment[key].points;
                         line += `${point},`;
                     }
                     line = line.slice(0, -1);
                 }
                 resultLines.push(line);
             });

             // check if there are multiple pages
             let hasNext = false;
             let url;
             headerinfo.forEach(info => {
                if(info.split(`;`)[1].trim() === `rel="next"`){
                    url = info.split(`;`)[0].slice(1,-1);
                    hasNext = true;
                }
              });

             if(hasNext){
                 getStudentResults(url);
             }else{
                 generateCSV();
             }
         })
		.catch(reason => console.log(reason));
    }

    const generateCSV = () => {
        let csvData = `${rubricDescriptions}\n`;
        resultLines.forEach(line => {
            csvData += `${line}\n`;
        });

        const $hidden = document.createElement(`a`);
        $hidden.setAttribute(`href`,`data:text/csv;charset=utf-8,${encodeURI(csvData)}`);
        $hidden.setAttribute(`target`,`_blank`);
        $hidden.setAttribute(`download`,`rubric-results.csv`);
        $hidden.click();
    }

    const getID = resource => {
        const resourceRegex = new RegExp(`/${resource}/([0-9]+)`);
        const matches = resourceRegex.exec(window.location.href);
        if(matches){
            return matches[1];
        }
        else{
            return false;
        }
    }

    const addZeros = name => {
        let line = `${name},`;
        for(let i = 1; i< rubricDescriptions.split(`,`).length;i++){
            line += `0,`;
        }
        return line.slice(0, -1);
    }

    // adding the button to the menu
    addDownloadButton();
})();