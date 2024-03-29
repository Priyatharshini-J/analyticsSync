const catalystSDK = require('zcatalyst-sdk-node')

const AppConstants = require('./constants')
const { AnalyticsService } = require('./services')

const isJsonObject = (object) => {
  return object && typeof object === 'object'
}

module.exports = async (event, context) => {
  try {
    const sourceType = event.getSource()
    if (sourceType === 'Datastore') {
      const data = event.data
      const action = event.getAction()
      const tableId = event.getSourceEntityId()
      const catalyst = catalystSDK.initialize(context)
      const { table_name: tableName } = await catalyst
        .datastore()
        .getTableDetails(tableId)
        .then((table) => table.toJSON())
      const orgId = process.env[AppConstants.Env.OrgId]
      const workspaceId = process.env[AppConstants.Env.WorkspaceId]
      const viewId = process.env[tableName + '_' + AppConstants.Env.ViewId]
      const analyticsInstance = AnalyticsService.getInstance()
      const viewInstance = analyticsInstance.getViewInstance(orgId, workspaceId, viewId)
      if (action === 'Insert') {
        for (let i = 0; i < data.length; i++) {
          const element = isJsonObject(data[i][tableName]) ? data[i][tableName] : data[i]
          await viewInstance.addRow(element)
        }
      } else if (action === 'Update') {
        for (let i = 0; i < data.length; i++) {
          const element = isJsonObject(data[i][tableName]) ? data[i][tableName] : data[i]
          await viewInstance.updateRow(element, 'ROWID = ' + element.ROWID)
        }
      } else {
        if (Array.isArray(data)) {
          for (let i = 0; i < data.length; i++) {
            const element = isJsonObject(data[i][tableName]) ? data[i][tableName] : data[i]
            await viewInstance.deleteRow('ROWID = ' + element.ROWID)
          }
        } else {
          await viewInstance.deleteRow('ROWID = ' + data.ROWID)
        }
      }
    }
    context.closeWithSuccess()
  } catch (error) {
    console.log('Error :::', error)
    context.closeWithFailure()
  }
}
