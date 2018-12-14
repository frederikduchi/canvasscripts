// ==UserScript==
// @name        View quiz submissions
// @namespace   https://github.com/frederikduchi/canvasscripts
// @description Shows the students who have submitted their quiz
// @include     https://*.instructure.com/courses/*/quizzes/*
// @version     1
// @grant       none
// ==/UserScript==

(function() {
    'use strict';

    // adding an additional button to the menu
    const addViewButton = () => {
        const $menu = document.querySelector(`.page-action-list`);
        if($menu){
            const $li = document.createElement(`li`);
            const $link = document.createElement(`a`);
            $link.setAttribute(`href`,`#`);
            $link.innerHTML = `<i class="icon-download">View submitted students</i>`;
            $li.appendChild($link);
            $link.addEventListener(`click`,clearView);
            $menu.appendChild($li);
        }
    }

    // clear the existing view of the quiz and replace it with container items for the submitted students
    const clearView = e => {
        const $header = document.querySelector(`.quiz-header`);
        $header.innerHTML = `<h1 id=quiz_title>Students who have submitted</h1><div class="quiz-submitted-container"><p class="loading-status"></p><input type="text" class="quiz-submitted-search"><ul class="quiz-submitted-results"></ul>`;

        const $input = document.querySelector(`.quiz-submitted-search`);
        $input.addEventListener(`keyup`,filterUsers);

        const $parent = document.querySelector(`.quiz-submitted-results`);
        $parent.innerHTML = ``;
        $parent.setAttribute(`style`,`height:650px;overflow:scroll;display:flex;flex-direction:column;flex-wrap:wrap;justify-content:flex-start`);

        const courseID = getID(`courses`);
        const quizID = getID(`quizzes`);
        getSubmissions(`/api/v1/courses/${courseID}/quizzes/${quizID}/submissions?&include[]=user&page=1&per_page=100`);

        e.preventDefault;
    }

    // getting all the submissions for the quiz
    const getSubmissions = url => {
        // set the status to loading
        const $status = document.querySelector(`.loading-status`);
        $status.textContent = `loading...`;

        let headerinfo;

        fetch(url).then(result => {
            headerinfo = result.headers.get(`Link`).split(`,`);
            return result.text()
        }).then(text => {
            const submissions = JSON.parse(text.split(`while(1);`)[1]);
            submissions.users.forEach(user => {
              createUser(user);
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
                 getSubmissions(url);
             }else{
                 $status.textContent = ``;
             }
        });
    }

    // create one user as a list-item
    const createUser = user => {
        const $parent = document.querySelector(`.quiz-submitted-results`);
        const $li = document.createElement(`li`);
        $li.setAttribute(`style`,`display:block`);
        $li.textContent = user.name;
        $parent.appendChild($li);
    };

    // filter the users based on the search filed
    const filterUsers = e => {
        const $input = e.currentTarget;
        const filter = $input.value.toLowerCase();
        console.log(filter);
        const items = document.querySelectorAll(`.quiz-submitted-results > li`);
        items.forEach($li => {
           console.log($li.textContent.toLowerCase());
           if($li.textContent.toLowerCase().includes(filter)){
              $li.setAttribute(`style`,`display:block`);
            }else{
              $li.setAttribute(`style`,`display:none`);
            }
        });
    }


    // get the ID for a resource
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

    addViewButton();
})();