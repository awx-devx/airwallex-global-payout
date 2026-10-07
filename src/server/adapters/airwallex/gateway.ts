import { mapBalance, mapBatch, mapItem, mapQuote } from '@/server/adapters/airwallex/map'
import { addItemsPayload, batchCreatePayload } from '@/server/adapters/airwallex/payload'
import type { AirwallexClient } from '@/server/adapters/airwallex/client'
import type { PaymentsGateway } from '@/server/adapters/payments/gateway'

export function createAirwallexGateway(client: AirwallexClient): PaymentsGateway {
  return {
    async currentBalance(currency, context) {
      return mapBalance(await client.balances(context), currency)
    },
    async createBatch(input, context) {
      return mapBatch(await client.createBatch(batchCreatePayload(input), context))
    },
    async findBatchByRequestId(requestId, context) {
      const matches = await client.listBatches(requestId, context)
      const batch = matches[0]
      return batch ? mapBatch(batch) : null
    },
    async addItems(batchId, items, context) {
      await client.addItems(batchId, addItemsPayload(items), context)
    },
    async listItems(batchId, context) {
      const items = await client.listItems(batchId, context)
      return items.map((item) => mapItem(item))
    },
    async deleteItems(batchId, itemIds, context) {
      await client.deleteItems(batchId, itemIds, context)
    },
    async quoteBatch(batchId, validity, context) {
      const response = await client.quote(batchId, validity, context)
      return mapQuote(response.quote_summary)
    },
    async submitBatch(batchId, context) {
      await client.submit(batchId, context)
      return mapBatch(await client.getBatch(batchId, context))
    },
    async getBatch(batchId, context) {
      return mapBatch(await client.getBatch(batchId, context))
    },
    async deleteBatch(batchId, context) {
      await client.deleteBatch(batchId, context)
    },
    getTransfer(transferId, context) {
      return client.getTransfer(transferId, context)
    },
    transitionTransfer(transferId, nextStatus, context) {
      return client.transitionTransfer(transferId, nextStatus, context)
    },
  }
}
