const firebase = require('firebase')

const firebaseConfig = {
  apiKey: 'AIzaSyC7SksKsqdvUC5ugpw8NtjTWNODdrKfLIQ',

  authDomain: 'eatstrylng.firebaseapp.com',

  databaseURL: 'https://eatstrylng-default-rtdb.firebaseio.com',

  projectId: 'eatstrylng',

  storageBucket: 'eatstrylng.appspot.com',

  messagingSenderId: '17160088795',

  appId: '1:17160088795:web:a4b2faa994150db944f0fe',

  measurementId: 'G-2N9MEH4JT8',
}
const app = firebase.initializeApp(firebaseConfig)

// const app = firebase.initializeApp({
//   apiKey: 'AIzaSyD7bOFb3RqJrrT54pJBLbweFGTkqfgMsYo',

//   authDomain: 'eatsonlinedb-7f921.firebaseapp.com',

//   databaseURL:
//     'https://eatsonlinedb-7f921-default-rtdb.asia-southeast1.firebasedatabase.app',

//   projectId: 'eatsonlinedb-7f921',

//   storageBucket: 'eatsonlinedb-7f921.appspot.com',

//   messagingSenderId: '55476911271',

//   appId: '1:55476911271:web:d353e08736a11ba5df6f82',

//   measurementId: 'G-8YPGVVNZDH',
// })
const data = app.database()
const storage = app.storage()
module.exports = {
  data,
  storage,
}
