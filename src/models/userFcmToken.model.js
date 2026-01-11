// models/UserFcmTokens.model.js
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const UserFcmTokens = sequelize.define(
    "UserFcmTokens",
     {
    token: {
      type: DataTypes.TEXT,
      unique: true,
      allowNull: false,
    },
  },
  {
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    deviceInfo: {
        type:DataTypes.STRING,
    }
  }
);

  return UserFcmTokens;
};

// import { DataTypes } from "sequelize";
// export default (sequelize) => {
//   const User = sequelize.define(
//     "User",
//     {
//       id: {
//         type: DataTypes.UUID,defaultValue: DataTypes.UUIDV4,primaryKey: true,
//       },
//     },
//     {
//       timestamps: true, // automatically adds createdAt & updatedAt
//       tableName: "Users",
//     }
//   );

//   return User;
// };
