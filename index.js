const { data, storage } = require('./firebase/firebasecon')
const cors = require('cors')
const express = require('express')
const uploadD = require('express-fileupload')
const app = express()
const server = require('http').createServer(app)
// Pass a http.Server instance to the listen method
const io = require('socket.io')(server)
const bodyParser = require('body-parser')
const {
  getMonthsInYear,
  getWeeksinMonths,
  encryptJSON,
  decryptJSON,
  decrypt,
  generateCode,
  checkLastKey,
  email,
  generateCode2,
  sendEmailtoUser,
} = require('./functions.js')
const sha256 = require('crypto-js/sha256')

const port = process.env.PORT || 8003

app.use(cors())
app.use(uploadD())
app.use(
  bodyParser.json({
    limit: '50mb',
  })
)
app.use(cors())

app.use(
  bodyParser.urlencoded({
    limit: '50mb',
    parameterLimit: 100000,
    extended: false,
  })
)

app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, OPTIONS, PUT, PATCH, DELETE'
  )
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type')
  res.setHeader('Access-Control-Allow-Credentials', true)
  next()
})

//socketssss

const chat = {}
data.ref('accounts').on('value', (snapshot) => {
  let x = []
  let allUser = []
  let count = 0
  let registered = 0
  snapshot.forEach((d) => {
    if (d.val().verified) {
      registered++
    }
    if (
      d.val().name !== 'DELETED USER' &&
      d.val().email !== 'DELETED USER' &&
      d.val().password !== 'DELETED USER' &&
      d.val().phoneNumber !== 'DELETED USER' &&
      d.val().verified !== 'DELETED USER'
    ) {
      x.push(d.val())
    } else {
      count++
    }
    allUser.push([d.key, d.val()])
  })
  allUser.reverse()
  x.sort((a, b) => b.totalspent - a.totalspent)
  io.emit('users', allUser)
  io.emit('registered', registered)
  io.emit('topbuyers', x)
})
data.ref('contactus').on('value', (snapshot) => {
  io.emit('feedbacknumber', snapshot.numChildren())
  let x = []
  snapshot.forEach((data) => {
    x.push([data.key, data.val()])
  })
  x.reverse()
  io.emit('feedbacks', x)
})
data.ref('reservation').on('value', (snapshot) => {
  io.emit('numberofadvance', snapshot.numChildren())
  let history = []
  snapshot.forEach((snap) => {
    history.push([snap.key, snap.val()])
  })
  history.reverse()
  io.emit('reservation', history)
})
data.ref('transaction').on('value', (snapshot) => {
  io.emit('numberoftransaction', snapshot.numChildren())
  let history = []
  snapshot.forEach((snap) => {
    history.push([snap.key, snap.val()])
  })
  history.reverse()
  io.emit('transaction', history)
})
data.ref('chat').on('value', async (snapshot) => {
  let snapshot2 = await data.ref('accounts').once('value')
  let o = []
  let num = []
  let newm = []
  let x = []
  let totalcount = 0
  let value = []
  snapshot.forEach((d) => {
    let object = {
      newm: [],
      num: 0,
      o: d.key,
      x: snapshot2.val()[d.key],
    }
    let v = d.val()
    let n = 0
    let count = 0
    for (let x in v) {
      if (count === d.numChildren() - 1) {
        object.newm = [
          v[x].who,
          v[x].message,
          v[x].date,
          v[x].who === 'admin' ? v[x].readbyu : v[x].readbya,
        ]
      } else {
        object.newm = [null, null, null]
      }
      if (!v[x].readbya) {
        n += 1
      }
      count++
    }
    object.num = n
    totalcount += n
    value.push(object)
  })

  value.sort((a, b) => {
    try {
      let date1 = new Date(a.newm[2])
      let date2 = new Date(b.newm[2])
      if (date1 > date2) return -1
      else if (date1 < date2) return 1
      else return 0
    } catch {
      return 0
    }
  })
  for (let v of value) {
    newm.push(v.newm)
    o.push(v.o)
    num.push(v.num)
    x.push(v.x)
  }
  io.emit('dataChat', [o, num, newm, x])

  io.emit('totalUnread', totalcount)
})
data.ref('products').on('value', async (snapshot) => {
  const snapshot2 = await data.ref('accounts').once('value')
  const val = snapshot2.val()
  let products = []
  let u = []
  let x = []
  let reviews = []
  snapshot.forEach((snap) => {
    if (snap.val().numberofitems <= snap.val().critical) {
      x.push(snap.val())
    }
    let m = []
    let avgrating = 0
    let comments = []
    let count = 0
    for (let value in snap.val().comments) {
      avgrating += parseInt(snap.val().comments[value].rating)
      let obj = snap.val().comments[value]
      obj.user = val[obj.id].name

      obj.email = val[obj.id].email
      obj.id = val[obj.id].id
      comments.push(obj)
      count++
    }

    for (let v in snap.val().adv) {
      m.push([v, snap.val().adv[v]])
    }
    avgrating = parseInt(avgrating / count)
    reviews.push({
      id: snap.key,
      comments,
      avgrating,
      link: snap.val().link,
      title: snap.val().title,
    })
    u.push([snap.key, m])
    products.push([snap.key, snap.val()])
  })
  io.emit('criticalproducts', x)
  io.emit('dates', u)
  io.emit('reviews', reviews)
  io.emit('products', products)
  products.sort((a, b) => a[1].totalsold - b[1].totalsold)
  products.reverse()
  io.emit('productssortsold', products)
})
data.ref('categories').on('value', (snapshot) => {
  let categories = []
  snapshot.forEach((snap) => {
    categories.push([snap.key, snap.val()])
  })
  io.emit('categories', categories)
})
data.ref('suppliers').on('value', (snapshot) => {
  let suppliers = []
  snapshot.forEach((snap) => {
    suppliers.push([snap.key, snap.val()])
  })
  io.emit('suppliers', suppliers)
})
io.on('connection', (client) => {
  client.on('chat', (userid) => {
    if (!chat[client.id]) {
      chat[client.id] = userid
      data
        .ref('chat')
        .child(userid)
        .limitToLast(1)
        .on('child_added', (snapshot) => {
          io.emit(`newchat/${chat[client.id]}`, [snapshot.key, snapshot.val()])
        })

      // data
      //   .ref('chat')
      //   .child(userid)
      //   .on('value', (snapshot) => {
      //     let send = []
      //     snapshot.forEach((val) => {
      //       send.push([val.key, val.val()])
      //     })
      //     io.emit(`chatchanged/${chat[client.id]}`, send)
      //   })
    }
  })

  client.on('disconnect', async () => {
    if (chat[client.id]) {
      let id = chat[client.id]
      await data.ref('chat').child(id).endAt().limitToLast(1).off()
      await data.ref('chat').child(id).off()
      delete chat[client.id]
    }
  })
})

app.use(function (err, req, res, next) {
  res.json(encryptJSON({ error: true, message: 'Error' }))
})

app.delete('/api/admin/v1/deleteprod', async (req, res) => {
  try {
    const id = req.query.id

    const ref = storage.ref(`images/${id}`)
    const dir = await ref.listAll()
    if (dir.items.length === 0) {
      await data.ref('products').child(id).remove()
      res.send(true)
    }
    dir.items.forEach(async (fileRef) => {
      const dirRef = storage.ref(fileRef.fullPath)
      const url = await dirRef.getDownloadURL()
      const imgRef = storage.refFromURL(url)
      await imgRef.delete()
      await data.ref('products').child(id).remove()
      res.send(true)
    })
  } catch (e) {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.get('/api/admin/v1/resetpass', async (req, res) => {
  try {
    let user = generateCode(8)
    let pass = generateCode2(12)
    await data.ref('admin').set({ user: user, pass: sha256(pass).toString() })
    await email(user, pass)
    res.send({
      reset: true,
    })
  } catch (e) {
    console.log(e)
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})
app.post('/api/admin/v1/login', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)
    let datas = req.body

    let user = decrypt(datas.user)
    let pass = sha256(decrypt(datas.pass)).toString()
    let request = await data.ref('admin').once('value')
    if (request.val().user === user && request.val().pass === pass) {
      res.send(
        encryptJSON({
          user: datas.user,
          pass: datas.pass,
          login: true,
        })
      )
    } else {
      res.send(
        encryptJSON({
          login: false,
        })
      )
    }
  } catch (e) {
    console.log(e)
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.post('/api/admin/v1/updateProduct', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)
    let set = req.body.data
    let id = req.body.id
    data
      .ref(`products/${id}`)
      .update(set)
      .then((d) => {
        res.send({
          update: true,
        })
      })
  } catch (e) {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.get('/api/admin/v1/getdate', async (req, res) => {
  try {
    data.ref('products').once('value', (snapshot) => {
      let u = []
      snapshot.forEach((snap) => {
        let m = []
        for (let v in snap.val().adv) {
          m.push([v, snap.val().adv[v]])
        }
        u.push([snap.key, m])
      })
      res.send({
        data: u,
      })
    })
  } catch {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.get('/api/admin/v1/getwhat', (req, res) => {
  try {
    let what = req.query.what
    data.ref(what).once('value', (snapshot) => {
      let products = []
      snapshot.forEach((snap) => {
        products.push([snap.key, snap.val()])
      })

      res.send({
        data: products,
      })
    })
  } catch {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.post('/api/admin/v1/updateProductwimg', async (req, res) => {
  try {
    const datav = req.files
    const body = req.body
    let set = JSON.parse(body.set)
    let buffer = datav['image'].data
    let imagename = body.imagename
    let imagetodelete = body.imagetodelete
    let title = body.title
    let id = body.id
    const delimage = storage.ref('images').child(`${imagetodelete}`)
    try {
      await delimage.delete()
    } catch {}
    await storage.ref(`images/${title}/${imagename}`).put(buffer)
    const url = await storage
      .ref(`images/${title}`)
      .child(imagename)
      .getDownloadURL()
    set['imgname'] = imagename
    set['link'] = url
    await data.ref('products').child(id).update(set)
    res.send({
      ch: true,
    })
  } catch (e) {
    console.log(e)
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

app.post('/api/admin/v1/add-products', async (req, res) => {
  try {
    const datav = req.files
    const body = req.body

    let set = JSON.parse(body.set)

    const image = datav['image'].data
    console.log(set, image)
    data
      .ref('products')
      .orderByChild('title')
      .equalTo(set.title)
      .once('value', async (snapshot) => {
        if (snapshot.val() === null) {
          const key = await checkLastKey('products')
          let x = await data.ref('products').push({
            title: set.title,
            description: set.desc,
            seller: set.seller,
            price: Number(set.price),
            numberofitems: parseInt(set.itemnum),
            link: null,
            type: set.type,
            imgname: set.n,
            id: key,
            date_created: new Date().toString(),
            totalsold: 0,
            critical: parseInt(set.c),
          })
          const uploadTask = storage
            .ref(`images`)
            .child(x.key)
            .child(set.n)
            .put(image)
          uploadTask.on(
            'state_changed',
            (snapshot) => {},
            (error) => {
              console.log(error)
            },
            () => {
              storage
                .ref(`images/${x.key}`)
                .child(set.n)
                .getDownloadURL()
                .then((url) => {
                  data
                    .ref('products')
                    .child(x.key)
                    .update({ link: url })
                    .then((x) => {
                      res.send({
                        success: true,
                      })
                    })
                })
            }
          )
        } else {
          res.send({
            success: false,
          })
        }
      })
  } catch (e) {
    console.log(e)
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

app.post('/api/admin/v1/addsupplierorcategory', (req, res) => {
  try {
    let datas = req.body

    const wh = datas.wh
    let d = datas.d
    data
      .ref(wh)
      .orderByChild('name')
      .equalTo(d.name)
      .once('value', (snapshot) => {
        if (snapshot.val() === null) {
          data
            .ref(wh)
            .limitToLast(1)
            .once('value', (snaps) => {
              if (snaps.val() === null) {
                if (wh === 'suppliers') {
                  d['id'] = 1001001
                } else {
                  d['id'] = 1000
                }

                data
                  .ref(wh)
                  .push(d)
                  .then(() => {
                    res.send(true)
                  })
              } else {
                snaps.forEach((sn) => {
                  if (wh === 'suppliers') {
                    d['id'] = sn.val().id + 134
                  } else {
                    d['id'] = sn.val().id + 65
                  }
                  data
                    .ref(wh)
                    .push(d)
                    .then(() => {
                      res.send(true)
                    })
                })
              }
            })
        } else {
          res.send(false)
        }
      })
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

app.delete('/api/admin/v1/removebyid', (req, res) => {
  try {
    data
      .ref(req.query.what)
      .child(req.query.id)
      .remove()
      .then(() => {
        res.send(true)
      })
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

app.put('/api/admin/v1/updatedate', async (req, res) => {
  try {
    let datas = req.body
    datas.dates.forEach(async (d) => {
      await data.ref('products').child(datas.id).child('adv').push(d)
    })
    res.send(true)
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

app.put('/api/admin/v1/updatecrit', (req, res) => {
  try {
    const datas = req.body
    data
      .ref('products')
      .child(datas.id)
      .update({ critical: parseInt(datas.val) })
      .then(() => {
        res.send(true)
      })
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

app.put('/api/admin/v1/updatediscount', (req, res) => {
  try {
    let datas = req.body

    if (
      (new Date().toDateString() === new Date(datas.f).toDateString() ||
        new Date() <= new Date(datas.f)) &&
      new Date(datas.e2) >= new Date(datas.f)
    ) {
      data
        .ref('products')
        .child(datas.id)
        .update({ discount: datas.v, startD: datas.f, endD: datas.e2 })
        .then(() => {
          res.send(true)
        })
    } else {
      res.send(false)
    }
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

app.delete('/api/admin/v1/deletedate', (req, res) => {
  try {
    const id = req.query.id
    const id2 = req.query.id2
    data
      .ref('products')
      .child(id)
      .child('adv')
      .child(id2)
      .remove()
      .then(() => {
        res.send(true)
      })
  } catch (e) {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})
app.delete('/api/admin/v1/deleteAllDate', (req, res) => {
  try {
    const id = req.query.id
    data
      .ref('products')
      .child(id)
      .child('adv')
      .remove()
      .then(() => {
        res.send(true)
      })
  } catch (e) {
    console.log(e)
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

/*FINISH INVENTORIES*/

app.post('/api/admin/v1/gettransact', async (req, res) => {
  try {
    let datas = req.body
    data.ref(datas.what).once('value', (snapshot) => {
      let history = []
      snapshot.forEach((snap) => {
        history.push([snap.key, snap.val()])
      })
      history.reverse()
      res.send(history)
    })
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

app.put('/api/admin/v1/updateaccounthistory', async (req, res) => {
  try {
    let idn = req.body.idn
    let set = req.body.set
    let v2 = req.body.v2
    let what = req.body.what
    data
      .ref(what)
      .child(idn)
      .set(set, async (error) => {
        if (error) {
          console.log(error)
        } else {
          if (set.status === 'Cancelled') {
            set.items.forEach(async (d) => {
              let snapshot = await data
                .ref('products')
                .child(d[1].key)
                .once('value')
              if (snapshot.val() !== null) {
                await data
                  .ref('products')
                  .child(d[1].key)
                  .update(
                    v2 !== 'Completed'
                      ? {
                          numberofitems:
                            snapshot.val().numberofitems + d[1].amount,
                        }
                      : {
                          numberofitems:
                            snapshot.val().numberofitems + d[1].amount,
                          totalsold: snapshot.val().totalsold - d[1].amount,
                        }
                  )
              }
            })
            if (v2 === 'Completed') {
              let sn = await data
                .ref('accounts')
                .child(set.userid)
                .once('value')
              data
                .ref('accounts')
                .child(set.userid)
                .update({
                  totalspent: Number(
                    sn.val().totalspent - Number(set.totalprice)
                  ),
                })
                .then(() => {
                  res.send(true)
                })
            } else {
              res.send(true)
            }
          } else {
            if (v2 === 'Completed') {
              set.items.forEach(async (d) => {
                let snapshot = await data
                  .ref('products')
                  .child(d[1].key)
                  .once('value')
                if (snapshot.val() !== null) {
                  await data
                    .ref('products')
                    .child(d[1].key)
                    .update({
                      totalsold: snapshot.val().totalsold - d[1].amount,
                    })
                }
              })
            } else if (v2 === 'Cancelled' && set.status === 'Completed') {
              set.items.forEach(async (d) => {
                let snapshot = await data
                  .ref('products')
                  .child(d[1].key)
                  .once('value')
                if (snapshot.val() !== null) {
                  await data
                    .ref('products')
                    .child(d[1].key)
                    .update({
                      totalsold: snapshot.val().totalsold + d[1].amount,
                    })
                }
              })
            }

            if (v2 === 'Cancelled' && set.status === 'Completed') {
              let sn = await data
                .ref('accounts')
                .child(set.userid)
                .once('value')
              data
                .ref('accounts')
                .child(set.userid)
                .update({
                  totalspent: Number(
                    sn.val().totalspent + Number(set.totalprice)
                  ),
                })
                .then(() => {
                  res.send(true)
                })
            } else if (v2 === 'Completed') {
              let sn = await data
                .ref('accounts')
                .child(set.userid)
                .once('value')
              data
                .ref('accounts')
                .child(set.userid)
                .update({
                  totalspent: Number(
                    sn.val().totalspent - Number(set.totalprice)
                  ),
                })
                .then(() => {
                  res.send(true)
                })
            } else {
              res.send(true)
            }
          }
        }
      })
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

app.post('/api/admin/v1/search', async (req, res) => {
  try {
    let v = req.body.v
    let n = req.body.n
    let t = req.body.t
    let what = req.body.what
    data
      .ref(what)
      .orderByChild(t)
      .startAt(v.toUpperCase())
      .endAt(v.toLowerCase() + '\uf8ff')
      .limitToFirst(n)
      .once('value', (snapshot) => {
        let history = []
        snapshot.forEach((snap) => {
          if (snap.val()[t].toLowerCase().includes(v.toLowerCase())) {
            history.push([snap.key, snap.val()])
          }
        })
        res.send(history)
      })
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

app.put('/api/admin/v1/updatetransactstatus', async (req, res) => {
  try {
    let hid = req.body.hid
    let idnum = req.body.idnum
    await data
      .ref('transaction')
      .child(hid)
      .update({ status: 'Completed', dateDelivered: new Date().toString() })
    let snapshot = await data.ref('accounts').child(idnum).once('value')
    let x = snapshot.val()
    let snaps = await data.ref('transaction').child(hid).once('value')
    let y = snaps.val().totalprice
    for (let items of snaps.val().items) {
      let snaps2 = await data.ref('products').child(items[1].key).once('value')
      await data
        .ref('products')
        .child(items[1].key)
        .update({ totalsold: snaps2.val().totalsold + items[1].amount })
    }
    data
      .ref('accounts')
      .child(idnum)
      .update({
        totalspent: parseFloat((Number(x.totalspent) + Number(y)).toFixed(2)),
      })
      .then((d) => {
        res.send(true)
      })
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

/*END OF ORDERSSSS */
app.put('/api/admin/v1/setpstatus', async (req, res) => {
  try {
    const datas = req.body
    await data.ref(datas.what).child(datas.id).update({ pstatus: datas.paid })
    res.send(true)
  } catch (e) {
    res.status(500).send({ message: 'error' })
  }
})
app.put('/api/admin/v1/setfee', async (req, res) => {
  try {
    const datas = req.body
    await data
      .ref(datas.what)
      .child(datas.id)
      .update({ deliveryfee: Number(datas.fee) })
    res.send(true)
  } catch (e) {
    res.status(500).send({ message: 'error' })
  }
})
app.put('/api/admin/v1/updateaccountadv', async (req, res) => {
  try {
    let idn = req.body.idn
    let set = req.body.set
    data
      .ref('reservation')
      .child(idn)
      .set(set, (error) => {
        if (error) {
          console.log(error)
        } else {
          if (set.status === 'Cancelled') {
            set.items.forEach((d) => {
              data
                .ref('products')
                .child(d[1].key)
                .once('value', (snapshot) => {
                  if (snapshot.val() !== null) {
                    data
                      .ref('products')
                      .child(d[1].key)
                      .update({
                        numberofitems:
                          snapshot.val().numberofitems + d[1].amount,
                      })
                  }
                })
            })
            res.send(true)
          } else {
            res.send(true)
          }
        }
      })
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

app.patch('/api/admin/v1/updateStatusCompleted', async (req, res) => {
  try {
    let hid = req.body.hid
    let idnum = req.body.idnum
    await data
      .ref('reservation')
      .child(hid)
      .update({ status: 'Completed', dateDelivered: new Date().toString() })
    let snapshot = await data.ref('accounts').child(idnum).once('value')
    let x = snapshot.val()
    let snaps = await data.ref('reservation').child(hid).once('value')
    let y = snaps.val().totalprice
    await data
      .ref('accounts')
      .child(idnum)
      .update({
        totalspent: parseFloat((Number(x.totalspent) + Number(y)).toFixed(2)),
      })
    res.send(true)
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

app.patch('/api/admin/v1/updateAdvanceItem', async (req, res) => {
  try {
    let id = req.body.id
    let index = req.body.index
    let d = req.body.d
    let v2 = req.body.v2
    let v0 = req.body.v0
    await data
      .ref('reservation')
      .child(id)
      .child('items')
      .child(index.toString())
      .child('1')
      .update(
        d === 'Completed'
          ? { status: d, dateDelivered: new Date().toString() }
          : d === 'Delivering'
          ? { status: d, deliveryfee: v0 }
          : { status: d }
      )
    if (d === 'Completed') {
      let snapshot = await data
        .ref('reservation')
        .child(id)
        .child('items')
        .child(index.toString())
        .child('1')
        .once('value')
      let snap = await data
        .ref('products')
        .child(snapshot.val().key)
        .once('value')
      await data
        .ref('products')
        .child(snapshot.val().key)
        .update({ totalsold: snap.val().totalsold + snapshot.val().amount })
      let snapshot2 = await data.ref('reservation').child(id).once('value')
      let sn = await data
        .ref('accounts')
        .child(snapshot2.val().userid)
        .once('value')
      await data
        .ref('accounts')
        .child(snapshot2.val().userid)
        .update({
          totalspent:
            sn.val().totalspent +
            Number(
              Number(snapshot.val().amount * snapshot.val().price).toFixed(2)
            ),
        })
    } else {
      if (v2 === 'Completed') {
        let snapshot = await data
          .ref('reservation')
          .child(id)
          .child('items')
          .child(index.toString())
          .child('1')
          .once('value')
        let snap = await data
          .ref('products')
          .child(snapshot.val().key)
          .once('value')
        await data
          .ref('products')
          .child(snapshot.val().key)
          .update({ totalsold: snap.val().totalsold - snapshot.val().amount })
        let snapshot2 = await data.ref('reservation').child(id).once('value')
        let sn = await data
          .ref('accounts')
          .child(snapshot2.val().userid)
          .once('value')
        await data
          .ref('accounts')
          .child(snapshot2.val().userid)
          .update({
            totalspent:
              sn.val().totalspent -
              Number(
                Number(snapshot.val().amount * snapshot.val().price).toFixed(2)
              ),
          })
      }
    }
    res.send(true)
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

/*END OF ADVANCED */

app.get('/api/admin/v1/getUserChats', async (req, res) => {
  try {
    let snapshot = await data.ref('chat').once('value')
    let snapshot2 = await data.ref('accounts').once('value')
    let o = []
    let num = []
    let newm = []
    let x = []
    let value = []
    snapshot.forEach((d) => {
      let object = {
        newm: [],
        num: 0,
        o: d.key,
        x: snapshot2.val()[d.key],
      }
      let v = d.val()
      let n = 0
      let count = 0
      for (let x in v) {
        if (count === d.numChildren() - 1) {
          object.newm = [
            v[x].who,
            v[x].message,
            v[x].date,
            v[x].who === 'admin' ? v[x].readbyu : v[x].readbya,
          ]
        } else {
          object.newm = [null, null, null]
        }
        if (!v[x].readbya) {
          n += 1
        }
        count++
      }
      object.num = n
      value.push(object)
    })

    value.sort((a, b) => {
      try {
        let date1 = new Date(a.newm[2])
        let date2 = new Date(b.newm[2])
        if (date1 > date2) return -1
        else if (date1 < date2) return 1
        else return 0
      } catch {
        return 0
      }
    })

    for (let v of value) {
      newm.push(v.newm)
      o.push(v.o)
      num.push(v.num)
      x.push(v.x)
    }

    res.send([o, num, newm, x])
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

app.post('/api/admin/v1/addChat', async (req, res) => {
  try {
    const id = req.body.id
    let snapshot = await data
      .ref('accounts')
      .orderByChild('id')
      .equalTo(id)
      .once('value')
    if (snapshot.val() === null) {
      res.send(false)
    } else {
      snapshot.forEach(async (snap) => {
        data
          .ref('chat')
          .child(snap.key)
          .push({
            message: 'Eats Online started a conversation. ',
            who: 'admin',
            date: new Date().toString(),
            readbya: true,
            readbyu: false,
          })
          .then((d) => {
            res.send(true)
          })
      })
    }
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

app.post('/api/admin/v1/getSingleChat', async (req, res) => {
  try {
    let id = req.body.id
    let snapshot = await data.ref('chat').child(id).once('value')
    let x = []
    snapshot.forEach((data) => {
      x.push(data)
    })
    res.send(x)
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

app.post('/api/admin/v1/sendChat', async (req, res) => {
  try {
    let id = req.body.id
    let message = req.body.m
    await data.ref('chat').child(id).push({
      message: message,
      who: 'admin',
      date: new Date().toString(),
      readbyu: false,
      readbya: true,
    })
    res.send(true)
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

app.patch('/api/admin/v1/readbya', async (req, res) => {
  try {
    let id = req.body.id
    let snapshot = await data.ref('chat').child(id).once('value')
    let value = snapshot.val()
    for (let x in snapshot.val()) {
      value[x].readbya = true
    }
    await data.ref('chat').child(id).set(value)
    res.send(true)
  } catch (e) {
    console.log(e)
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

app.get('/api/admin/v1/getNotRead', async (req, res) => {
  try {
    let snapshot = await data.ref('chat').once('value')
    let number = 0
    snapshot.forEach((snap) => {
      let v = snap.val()
      for (let x in v) {
        if (!v[x].readbya) {
          number += 1
        }
      }
    })
    res.send({ data: number })
  } catch (e) {
    console.log(e)
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

/*END OF CHAT */

app.get('/api/admin/v1/logs', async (req, res) => {
  try {
    let d = parseInt(req.query.d)
    data
      .ref('logs')
      .limitToLast(d)
      .once('value', (snapshot) => {
        let logs = []
        snapshot.forEach((snap) => {
          logs.push(snap.val())
        })
        logs.reverse()
        res.send(logs)
        data.ref('logs').limitToLast(d).off()
      })
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

app.delete('/api/admin/v1/clearlogs', async (req, res) => {
  try {
    await data.ref('logs').remove()
    res.send(true)
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

/*END OF LOGS*/
app.post('/api/admin/v1/generateExcel', async (req, res) => {
  try {
    let id = req.body.id
    let what = req.body.what

    if (id.length === 0) {
      data.ref(what).once('value', (snapshot) => {
        let x = []
        snapshot.forEach((snap) => {
          x.push(snap.val())
        })
        res.send(x)
      })
    } else if (id.length === 1) {
      data
        .ref(what)
        .child(id[0])
        .once('value', (snapshot) => {
          let x = []
          snapshot.forEach((snap) => {
            x.push(snap.val())
          })
          res.send(x)
        })
    } else if (id.length === 2) {
      data
        .ref(what)
        .child(id[0])
        .child(id[1])
        .once('value', (snapshot) => {
          let x = []
          snapshot.forEach((snap) => {
            x.push(snap.val())
          })
          res.send(x)
        })
    } else if (id.length === 3) {
      data
        .ref(what)
        .child(id[0])
        .child(id[1])
        .child(id[2])
        .once('value', (snapshot) => {
          let x = []
          snapshot.forEach((snap) => {
            x.push(snap.val())
          })
          res.send(x)
        })
    }
  } catch (e) {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

/*END OF GENEXCEL*/

app.get('/api/admin/v1/getFeedBacks', async (req, res) => {
  try {
    let snapshot = await data.ref('contactus').once('value')
    let x = []
    snapshot.forEach((d) => {
      x.push([d.key, d.val()])
    })
    x.reverse()
    res.send(x)
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

app.post('/api/admin/v1/sendFeedback', async (req, res) => {
  try {
    let datas = req.body.data
    let check = await sendEmailtoUser(
      datas.message,
      datas.answer,
      datas.name,
      datas.email,
      datas.subject
    )

    if (check) {
      data
        .ref('contactus')
        .child(datas.key)
        .update({
          reply: { date: new Date().toString(), answer: datas.answer },
        })
    }
    res.send({ send: check })
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

/*END OF CONTACT US */

app.get('/api/admin/v1/getReviews', async (req, res) => {
  try {
    const snapshot = await data.ref('products').once('value')
    const snapshot2 = await data.ref('accounts').once('value')
    let val = snapshot2.val()
    let reviews = []
    snapshot.forEach((snap) => {
      let avgrating = 0
      let comments = []
      let count = 0
      for (let value in snap.val().comments) {
        avgrating += parseInt(snap.val().comments[value].rating)
        let obj = snap.val().comments[value]
        obj.user = val[obj.id].name
        obj.email = val[obj.id].email
        obj.id = val[obj.id].id
        comments.push(obj)
        count++
      }
      avgrating = parseInt(avgrating / count)
      reviews.push({
        id: snap.key,
        comments,
        avgrating,
        link: snap.val().link,
        title: snap.val().title,
      })
    })
    res.send(reviews)
  } catch (e) {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

/*END OF REVIEW*/

app.get('/api/admin/v1/getAllAccounts', async (req, res) => {
  try {
    const snapshot = await data.ref('accounts').once('value')
    let dat = []
    snapshot.forEach((snap) => {
      dat.push([snap.key, snap.val()])
    })
    dat.reverse()
    res.send(dat)
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

app.get('/api/admin/v1/getCart', async (req, res) => {
  try {
    const snapshot = await data.ref('cart').child(req.query.id).once('value')
    let cart = []
    snapshot.forEach((snap) => {
      cart.push([snap.key, snap.val()])
    })
    cart.reverse()
    res.send(cart)
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

app.delete('/api/admin/v1/deleteUser', async (req, res) => {
  try {
    const id = req.query.id.replaceAll(' ', '+')
    await data.ref('accounts').child(id).update({
      name: 'DELETED USER',
      email: 'DELETED USER',
      phoneNumber: 'DELETED USER',
      password: 'DELETED USER',
      verified: 'DELETED USER',
      totalspent: 0,
      guest: 'DELETED USER',
    })
    res.send({ ch: true })
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

//END OF ACCOUNTS
app.get('/api/admin/v1/getPayment', async (req, res) => {
  const snapshot = await data.ref('bank').once('value')
  const snapshot2 = await data.ref('gcash').once('value')

  res.send([snapshot.val(), snapshot2.val()])
})

app.patch('/api/admin/v1/updateQRdata', async (req, res) => {
  try {
    const datas = req.body
    await data.ref(datas.what).update(datas.updates)
    res.send({ success: true })
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

app.patch('/api/admin/v1/updateQRCode', async (req, res) => {
  try {
    const datav = req.files
    const body = req.body
    let buffer = datav['image'].data
    let imagename = body.imagename
    let what = body.what
    const delimage = storage.ref('qrcodes').child(what)
    try {
      const dir = await delimage.listAll()
      dir.items.forEach(async (fileRef) => {
        const dirRef = storage.ref(fileRef.fullPath)
        const url = await dirRef.getDownloadURL()
        const imgRef = storage.refFromURL(url)
        await imgRef.delete()
      })
    } catch {}
    await storage.ref(`qrcodes/${what}/${imagename}`).put(buffer)
    const url = await storage
      .ref(`qrcodes/${what}`)
      .child(imagename)
      .getDownloadURL()
    await data.ref(what).update({ url: url })
    res.send({
      ch: true,
    })
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

//END OF QR CODE

app.get('/api/admin/v1/getCriticalProducts', async (req, res) => {
  try {
    const snapshot = await data
      .ref('products')
      .orderByChild('numberofitems')
      .once('value')
    let x = []
    snapshot.forEach((snap) => {
      if (snap.val().numberofitems <= snap.val().critical) {
        x.push(snap.val())
      }
    })
    res.send(x)
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

//END OF CRITICAL
app.get('/api/admin/v1/numberoftransactions', async (req, res) => {
  try {
    const snapshot = await data.ref('transaction').once('value')
    res.send({ num: snapshot.numChildren() })
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

app.get('/api/admin/v1/numberofadvance', async (req, res) => {
  try {
    const snapshot2 = await data.ref('reservation').once('value')
    res.send({ num: snapshot2.numChildren() })
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

app.get('/api/admin/v1/getAllprods', async (req, res) => {
  try {
    const snapshot = await data.ref('products').once('value')
    let x = []
    snapshot.forEach((snap) => {
      x.push([snap.key, snap.val()])
    })
    x.sort((a, b) => a[1].totalsold - b[1].totalsold)
    x.reverse()
    res.send(x)
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

app.get('/api/admin/v1/getTopBuyer', async (req, res) => {
  try {
    const snapshot = await data
      .ref('accounts')
      .orderByChild('totalspent')
      .once('value')
    let x = []
    let count = 0
    snapshot.forEach((d) => {
      if (
        d.val().name !== 'DELETED USER' &&
        d.val().email !== 'DELETED USER' &&
        d.val().password !== 'DELETED USER' &&
        d.val().phoneNumber !== 'DELETED USER' &&
        d.val().verified !== 'DELETED USER'
      ) {
        x.push(d.val())
      } else {
        count++
      }
    })
    x.sort((a, b) => b.totalspent - a.totalspent)
    res.send(x)
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})
app.get('/api/admin/v1/countRegistered', async (req, res) => {
  try {
    const snapshot = await data
      .ref('accounts')
      .orderByChild('verified')
      .equalTo(true)
      .once('value')
    res.send({ num: snapshot.numChildren() })
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})
app.get('/api/admin/v1/feedbacknumber', async (req, res) => {
  try {
    const snapshot = await data.ref('contactus').once('value')
    res.send({ num: snapshot.numChildren() })
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

app.get('/api/admin/v1/weeklyTransaction', async (req, res) => {
  try {
    let date = null
    let copyDate = null
    if (req.query.what == 'TODAY') {
      date = new Date()
      copyDate = new Date(date)
    } else {
      date = new Date(req.query.date)
    }

    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1)
    date.setDate(diff)
    date.setHours(0)
    date.setMinutes(0)
    date.setSeconds(0)
    if (!(req.query.what == 'TODAY')) {
      copyDate = new Date(date.toString())
      copyDate.setDate(copyDate.getDate() + 6)
    }
    copyDate.setHours(23)
    copyDate.setMinutes(59)
    copyDate.setSeconds(59)
    const firstDay = date
    const dateToday = copyDate
    const snapshot = await data
      .ref('transaction')
      .orderByChild('status')
      .equalTo('Completed')
      .once('value')

    const obj = {
      M: { index: 0, data: [] },
      T: { index: 1, data: [] },
      W: { index: 2, data: [] },
      TH: { index: 3, data: [] },
      F: { index: 4, data: [] },
      SA: { index: 5, data: [] },
      S: { index: 6, data: [] },
    }
    snapshot.forEach((snap) => {
      if (snap.val().dateDelivered) {
        const dateTransaction = new Date(snap.val().dateDelivered)
        if (dateTransaction >= firstDay && dateTransaction <= dateToday) {
          if (dateTransaction.getDay() === 0) {
            obj.S.data.push(snap.val().totalprice)
          }
          if (dateTransaction.getDay() === 1) {
            obj.M.data.push(snap.val().totalprice)
          }
          if (dateTransaction.getDay() === 2) {
            obj.T.data.push(snap.val().totalprice)
          }
          if (dateTransaction.getDay() === 3) {
            obj.W.data.push(snap.val().totalprice)
          }
          if (dateTransaction.getDay() === 4) {
            obj.TH.data.push(snap.val().totalprice)
          }
          if (dateTransaction.getDay() === 5) {
            obj.F.data.push(snap.val().totalprice)
          }
          if (dateTransaction.getDay() === 6) {
            obj.SA.data.push(snap.val().totalprice)
          }
        }
      }
    })
    let arr = { data: {}, overall: 0 }
    let highest = 0
    for (let x in obj) {
      let total = 0
      for (let value of obj[x].data) total += value
      if (total > highest) highest = total
      arr.data[obj[x].index] = { day: x, total: total }
      arr.overall += total
    }
    for (let x in arr.data) {
      arr.data[x].percentage = (arr.data[x].total / highest) * 100
    }

    res.send(arr)
  } catch (e) {
    res.status(500).send({ message: e.toString() })
  }
})

app.get('/api/admin/v1/monthlyTransaction', async (req, res) => {
  try {
    const month = Number(req.query.month)
    const year = Number(req.query.year)
    let date = new Date()
    date.setMonth(month)
    date.setFullYear(year)
    date.setDate(1)
    date.setHours(0)
    date.setMinutes(0)
    date.setSeconds(0)
    const obj = getWeeksinMonths(date.toString())
    const snapshot = await data
      .ref('transaction')
      .orderByChild('status')
      .equalTo('Completed')
      .once('value')

    snapshot.forEach((snap) => {
      if (snap.val().dateDelivered) {
        const dateTransaction = new Date(snap.val().dateDelivered)
        for (let value in obj) {
          if (
            obj[value].monday <= dateTransaction &&
            dateTransaction <= obj[value].sunday
          ) {
            obj[value].data.push(snap.val().totalprice)
            break
          }
        }
      }
    })

    let arr = { data: {}, overall: 0 }
    let highest = 0
    for (let x in obj) {
      let total = 0
      for (let value of obj[x].data) total += value
      if (total > highest) highest = total
      arr.data[x] = { day: 'Week ' + (Number(x) + 1), total: total }
      arr.overall += total
    }
    for (let x in arr.data) {
      arr.data[x].percentage = (arr.data[x].total / highest) * 100
    }
    res.send(arr)
  } catch (e) {
    res.status(500).send({ message: e.toString() })
  }
})

app.get('/api/admin/v1/yearlyTransaction', async (req, res) => {
  try {
    const month = [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC',
    ]
    const year = Number(req.query.year)
    let obj = getMonthsInYear(year)
    const snapshot = await data
      .ref('transaction')
      .orderByChild('status')
      .equalTo('Completed')
      .once('value')

    snapshot.forEach((snap) => {
      if (snap.val().dateDelivered) {
        const dateTransaction = new Date(snap.val().dateDelivered)
        for (let value in obj) {
          if (
            obj[value].first <= dateTransaction &&
            dateTransaction <= obj[value].last
          ) {
            obj[value].data.push(snap.val().totalprice)
            break
          }
        }
      }
    })
    let arr = { data: {}, overall: 0 }
    let highest = 0
    for (let x in obj) {
      let total = 0
      for (let value of obj[x].data) total += value
      if (total > highest) highest = total
      arr.data[x] = { day: month[Number(x)], total: total }
      arr.overall += total
    }
    for (let x in arr.data) {
      arr.data[x].percentage = (arr.data[x].total / highest) * 100
    }
    res.send(arr)
  } catch (e) {
    res.status(500).send({ message: e.toString() })
  }
})

server.listen(port, () => {
  console.log('app listening on port: ', port)
})
