let af_3_visit = localStorage.getItem('af_3_visit');
let af_3_firstSession = sessionStorage.getItem('af_3_first_session');

let af_3 = false;

if (!af_3_visit && !af_3_firstSession) {
  	sessionStorage.setItem('af_3_first_session', 'true');
  	localStorage.setItem('af_3_visit', '.');
  	af_3 = true;
} else if (af_3_visit == '.' && af_3_firstSession == 'true') {
	af_3 = true;
} else if (af_3_visit == '.' && !af_3_firstSession) {
	localStorage.setItem('af_3_visit', '-');
  	af_3 = false;
} else {
	af_3 = false;
}