const { models } = require('../backend/src/database');

async function makeSuperAdmin(email) {
  const user = await models.User.findOne({ where: { email } });
  if (!user) {
    console.log('User not found');
    return;
  }
  user.role = 'super_admin';
  await user.save();
  console.log(`User ${email} is now a super_admin`);
}

makeSuperAdmin('shamail.fa.0101@gamail.com');