import Chance from 'chance'

const chance = new Chance()

export default () => ({
  message: chance.paragraph({
    sentences: Math.floor(Math.random() * 7),
  }),
  avatar: chance.avatar(),
  user: chance.name({
    middle: Math.random() > .5
  })
})