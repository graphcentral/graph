# notion-knowledge-graph

## API

### `this.unofficialNotionAPI.getPage()`
- Returns the list of the page itself and recurisve parents.
- The order of the list reflects the parent-child relationship: for example, 

  ```
  "Simple testing ground" <-- the parent of everything
    
    ...

    "otherpage" <-- child of some page in the middle
      "otherpage-nested" <-- child of "otherpage" 
        "also-nested" <-- child of "otherpage-nested"
  ```

  the API call to `also-nested` in this structure of pages returns:

  ```json
  {
    "c9d98d57-b00f-4c36-88e0-5b6218e1b272": {
      "role": "reader",
      "value": {
        "id": "c9d98d57-b00f-4c36-88e0-5b6218e1b272",
        "version": 18,
        "type": "page",
        "properties": {
          "title": [
            [
              "also-nested"
            ]
          ]
        },
        "created_time": 1655112151694,
        "last_edited_time": 1655112120000,
        "parent_id": "de2cb37e-994c-449b-8ee7-832805e1ca56",
        "parent_table": "block",
        "alive": true,
        "created_by_table": "notion_user",
        "created_by_id": "a5b8452a-14a3-4719-a224-ea678b37f50c",
        "last_edited_by_table": "notion_user",
        "last_edited_by_id": "a5b8452a-14a3-4719-a224-ea678b37f50c",
        "space_id": "6af4dea3-6d07-4986-9c7e-c2b8bc430408"
      }
    },
    "de2cb37e-994c-449b-8ee7-832805e1ca56": {
      "role": "reader",
      "value": {
        "id": "de2cb37e-994c-449b-8ee7-832805e1ca56",
        "version": 27,
        "type": "page",
        "properties": {
          "title": [
            [
              "otherpage-nested"
            ]
          ]
        },
        "content": [
          "c9d98d57-b00f-4c36-88e0-5b6218e1b272"
        ],
        "created_time": 1655112019020,
        "last_edited_time": 1655112120000,
        "parent_id": "cfa04bab-3563-498b-9273-5a38b18f612e",
        "parent_table": "block",
        "alive": true,
        "created_by_table": "notion_user",
        "created_by_id": "a5b8452a-14a3-4719-a224-ea678b37f50c",
        "last_edited_by_table": "notion_user",
        "last_edited_by_id": "a5b8452a-14a3-4719-a224-ea678b37f50c",
        "space_id": "6af4dea3-6d07-4986-9c7e-c2b8bc430408"
      }
    },
    "cfa04bab-3563-498b-9273-5a38b18f612e": {
      "role": "reader",
      "value": {
        "id": "cfa04bab-3563-498b-9273-5a38b18f612e",
        "version": 15,
        "type": "page",
        "properties": {
          "title": [
            [
              "otherpage"
            ]
          ]
        },
        "content": [
          "de2cb37e-994c-449b-8ee7-832805e1ca56"
        ],
        "created_time": 1655112015334,
        "last_edited_time": 1655112000000,
        "parent_id": "1f96a097-fd1a-4c53-a3c4-2a3288f39e9d",
        "parent_table": "block",
        "alive": true,
        "created_by_table": "notion_user",
        "created_by_id": "a5b8452a-14a3-4719-a224-ea678b37f50c",
        "last_edited_by_table": "notion_user",
        "last_edited_by_id": "a5b8452a-14a3-4719-a224-ea678b37f50c",
        "space_id": "6af4dea3-6d07-4986-9c7e-c2b8bc430408"
      }
    },

    ...


    "1f96a097-fd1a-4c53-a3c4-2a3288f39e9d": {
      "role": "reader",
      "value": {
        "id": "1f96a097-fd1a-4c53-a3c4-2a3288f39e9d",
        "version": 140,
        "type": "page",
        "properties": {
          "title": [
            [
              "Simple testing ground"
            ]
          ]
        },
        "content": [
          "7d8579f7-78fb-48bc-871b-4efd9e1e795d",
          "72e6bb69-eeed-4971-8de8-b5acee2139da",
          "2ffa6e37-10f9-4ca3-b053-85807bcacb03",
          "cfa04bab-3563-498b-9273-5a38b18f612e"
        ],
        "format": {
          "page_icon": "🌥️"
        },
        "permissions": [
          {
            "role": "editor",
            "type": "user_permission",
            "user_id": "a5b8452a-14a3-4719-a224-ea678b37f50c"
          },
          {
            "role": "reader",
            "type": "public_permission",
            "added_timestamp": 1655094244633
          }
        ],
        "created_time": 1655094180000,
        "last_edited_time": 1655112000000,
        "parent_id": "6af4dea3-6d07-4986-9c7e-c2b8bc430408",
        "parent_table": "space",
        "alive": true,
        "created_by_table": "notion_user",
        "created_by_id": "a5b8452a-14a3-4719-a224-ea678b37f50c",
        "last_edited_by_table": "notion_user",
        "last_edited_by_id": "a5b8452a-14a3-4719-a224-ea678b37f50c",
        "space_id": "6af4dea3-6d07-4986-9c7e-c2b8bc430408"
      }
    }
  }
  ```

  The list will end with a block that is recursively topmost in the parent-child relationship. The last block therefore must have `"parent_table": "space"`. Note that the concept of topmost page is called `space` in the API. It is not fully equivalent to the topmost page though. Space is just an abstract concept.

  if you run request with the id of a page somewhere in the middle of parent-child chain, then you will get its recursive parents, and its first level child (not recursive).

  For example:

  ```
  1
    2
      3
        4
          5
  ```

  A request with the id of 3 will return info in this order:

  ```
  [
    3,
    1,
    2,
    4
  ]
  ```

  For another example with the same structure of pages, if a request with the id of 1 is sent, the response will be:

  ```
  [
    1,
    2
  ]
  ```

  Therefore, a strategy to recursively get all blocks is to perform DFS. 
  Note that other types of blocks may be present in between. We are only talking about `page` types here.

### `getBlocks(blockIds: string[])`

```ts
client.getBlocks([
  // some block id (like collection id or page id), possibly obtained from the result of getPage()
  separateIdWithDashSafe(`da588333932748dbbc4b-084ab6131aad`),
]),
```

blockIds are an array of ids that are separated by dash based on the format specified by the API. (Just use `separateIdWithDashSafe(id)`)

returns a record map.

#### Example return value of getBlocks([collectionId])

This returns

```ts
{
  "recordMap": {
    "block": {
      "da588333-9327-48db-bc4b-084ab6131aad": {
        "role": "reader",
        "value": {
          "id": "da588333-9327-48db-bc4b-084ab6131aad",
          "version": 11,
          "type": "collection_view",
          "view_ids": [
            "056b92f8-6fbc-4565-a0d2-597f03666fd8"
          ],
          "collection_id": "58e7440f-fad4-4a30-9de3-2dc5f5673b62",
          "format": {
            "collection_pointer": {
              "id": "58e7440f-fad4-4a30-9de3-2dc5f5673b62",
              "table": "collection",
              "spaceId": "6af4dea3-6d07-4986-9c7e-c2b8bc430408"
            }
          },
          "created_time": 1655113911514,
          "last_edited_time": 1655113914028,
          "parent_id": "1f96a097-fd1a-4c53-a3c4-2a3288f39e9d",
          "parent_table": "block",
          "alive": true,
          "created_by_table": "notion_user",
          "created_by_id": "a5b8452a-14a3-4719-a224-ea678b37f50c",
          "last_edited_by_table": "notion_user",
          "last_edited_by_id": "a5b8452a-14a3-4719-a224-ea678b37f50c",
          "space_id": "6af4dea3-6d07-4986-9c7e-c2b8bc430408"
        }
      }
    }
  }
}
```

#### Example return value of getBlocks([pageId])

```ts
{
  "recordMap": {
    "block": {
      "1f96a097-fd1a-4c53-a3c4-2a3288f39e9d": {
        "role": "reader",
        "value": {
          "id": "1f96a097-fd1a-4c53-a3c4-2a3288f39e9d",
          "version": 158,
          "type": "page",
          "properties": {
            "title": [
              [
                "Simple testing ground"
              ]
            ]
          },
          "content": [
            "cfa04bab-3563-498b-9273-5a38b18f612e",
            "da588333-9327-48db-bc4b-084ab6131aad"
          ],
          "format": {
            "page_icon": "🌥️"
          },
          "permissions": [
            {
              "role": "editor",
              "type": "user_permission",
              "user_id": "a5b8452a-14a3-4719-a224-ea678b37f50c"
            },
            {
              "role": "reader",
              "type": "public_permission",
              "added_timestamp": 1655094244633
            }
          ],
          "created_time": 1655094180000,
          "last_edited_time": 1655113860000,
          "parent_id": "6af4dea3-6d07-4986-9c7e-c2b8bc430408",
          "parent_table": "space",
          "alive": true,
          "created_by_table": "notion_user",
          "created_by_id": "a5b8452a-14a3-4719-a224-ea678b37f50c",
          "last_edited_by_table": "notion_user",
          "last_edited_by_id": "a5b8452a-14a3-4719-a224-ea678b37f50c",
          "space_id": "6af4dea3-6d07-4986-9c7e-c2b8bc430408"
        }
      }
    }
  }
}
```

### `getCollectionData(collectionId: string, collectionViewId: string, collectionView: CollectionView)`

First, you need to call `getBlocks()` to get collectionView. Let's pretend that we have below output from `getBlocks()`.

```ts
const getBlocksResult = {
  "recordMap": {
    "block": {
      "da588333-9327-48db-bc4b-084ab6131aad": {
        "role": "reader",
        "value": {
          "id": "da588333-9327-48db-bc4b-084ab6131aad",
          "version": 11,
          "type": "collection_view",
          "view_ids": [
            "056b92f8-6fbc-4565-a0d2-597f03666fd8"
          ],
          "collection_id": "58e7440f-fad4-4a30-9de3-2dc5f5673b62",
          "format": {
            "collection_pointer": {
              "id": "58e7440f-fad4-4a30-9de3-2dc5f5673b62",
              "table": "collection",
              "spaceId": "6af4dea3-6d07-4986-9c7e-c2b8bc430408"
            }
          },
          "created_time": 1655113911514,
          "last_edited_time": 1655113914028,
          "parent_id": "1f96a097-fd1a-4c53-a3c4-2a3288f39e9d",
          "parent_table": "block",
          "alive": true,
          "created_by_table": "notion_user",
          "created_by_id": "a5b8452a-14a3-4719-a224-ea678b37f50c",
          "last_edited_by_table": "notion_user",
          "last_edited_by_id": "a5b8452a-14a3-4719-a224-ea678b37f50c",
          "space_id": "6af4dea3-6d07-4986-9c7e-c2b8bc430408"
        }
      }
    }
  }
}
```

Then we just call

```ts
const collectionBlock = getBlocksResult.recordMap.block[`da588333-9327-48db-bc4b-084ab6131aad`]
const collectionData = await notionUnofficialClient.getCollectionData(
    // collection id from collectionBlock.value (equivalent to collectionBlock.value.collection_id)
    `58e7440f-fad4-4a30-9de3-2dc5f5673b62`,
    // collection id from collectionBlock.value (equivalent to collectionBlock.value.view_ids[0]) 
    `056b92f8-6fbc-4565-a0d2-597f03666fd8`,
    collectionBlock.value
  )
```

This returns something like 

```json
{
  "result": {
    "type": "reducer",
    "reducerResults": {
      "collection_group_results": {
        "type": "results",
        "blockIds": [
          "73c7256e-f1b5-4fab-abc9-77536951ba33",
          "f3961580-1bd0-4fdc-a948-f16b450058d4",
          "11c93ec1-465d-4e4d-b331-419887cee722"
        ],
        "hasMore": false
      }
    },
    "sizeHint": 3
  },
  "recordMap": {
    "block": {
      "73c7256e-f1b5-4fab-abc9-77536951ba33": {
        "role": "reader",
        "value": {
          "id": "73c7256e-f1b5-4fab-abc9-77536951ba33",
          "version": 6,
          "type": "page",
          "properties": {
            "title": [
              [
                "db#1"
              ]
            ]
          },
          "created_time": 1655113911514,
          "last_edited_time": 1655113860000,
          "parent_id": "58e7440f-fad4-4a30-9de3-2dc5f5673b62",
          "parent_table": "collection",
          "alive": true,
          "created_by_table": "notion_user",
          "created_by_id": "a5b8452a-14a3-4719-a224-ea678b37f50c",
          "last_edited_by_table": "notion_user",
          "last_edited_by_id": "a5b8452a-14a3-4719-a224-ea678b37f50c",
          "space_id": "6af4dea3-6d07-4986-9c7e-c2b8bc430408"
        }
      },
      "f3961580-1bd0-4fdc-a948-f16b450058d4": {
        "role": "reader",
        "value": {
          "id": "f3961580-1bd0-4fdc-a948-f16b450058d4",
          "version": 9,
          "type": "page",
          "properties": {
            "title": [
              [
                "db#2"
              ]
            ]
          },
          "content": [
            "896ef183-f406-4750-9d10-d1fba05ce6b0"
          ],
          "created_time": 1655113911514,
          "last_edited_time": 1655114400000,
          "parent_id": "58e7440f-fad4-4a30-9de3-2dc5f5673b62",
          "parent_table": "collection",
          "alive": true,
          "created_by_table": "notion_user",
          "created_by_id": "a5b8452a-14a3-4719-a224-ea678b37f50c",
          "last_edited_by_table": "notion_user",
          "last_edited_by_id": "a5b8452a-14a3-4719-a224-ea678b37f50c",
          "space_id": "6af4dea3-6d07-4986-9c7e-c2b8bc430408"
        }
      },
      "11c93ec1-465d-4e4d-b331-419887cee722": {
        "role": "reader",
        "value": {
          "id": "11c93ec1-465d-4e4d-b331-419887cee722",
          "version": 7,
          "type": "page",
          "properties": {
            "title": [
              [
                "db#3"
              ]
            ]
          },
          "created_time": 1655113911514,
          "last_edited_time": 1655113920000,
          "parent_id": "58e7440f-fad4-4a30-9de3-2dc5f5673b62",
          "parent_table": "collection",
          "alive": true,
          "created_by_table": "notion_user",
          "created_by_id": "a5b8452a-14a3-4719-a224-ea678b37f50c",
          "last_edited_by_table": "notion_user",
          "last_edited_by_id": "a5b8452a-14a3-4719-a224-ea678b37f50c",
          "space_id": "6af4dea3-6d07-4986-9c7e-c2b8bc430408"
        }
      },
      "da588333-9327-48db-bc4b-084ab6131aad": {
        "role": "reader",
        "value": {
          "id": "da588333-9327-48db-bc4b-084ab6131aad",
          "version": 16,
          "type": "collection_view",
          "view_ids": [
            "056b92f8-6fbc-4565-a0d2-597f03666fd8"
          ],
          "collection_id": "58e7440f-fad4-4a30-9de3-2dc5f5673b62",
          "format": {
            "collection_pointer": {
              "id": "58e7440f-fad4-4a30-9de3-2dc5f5673b62",
              "table": "collection",
              "spaceId": "6af4dea3-6d07-4986-9c7e-c2b8bc430408"
            }
          },
          "created_time": 1655113911514,
          "last_edited_time": 1655115421804,
          "parent_id": "1f96a097-fd1a-4c53-a3c4-2a3288f39e9d",
          "parent_table": "block",
          "alive": true,
          "created_by_table": "notion_user",
          "created_by_id": "a5b8452a-14a3-4719-a224-ea678b37f50c",
          "last_edited_by_table": "notion_user",
          "last_edited_by_id": "a5b8452a-14a3-4719-a224-ea678b37f50c",
          "space_id": "6af4dea3-6d07-4986-9c7e-c2b8bc430408"
        }
      },
      "1f96a097-fd1a-4c53-a3c4-2a3288f39e9d": {
        "role": "reader",
        "value": {
          "id": "1f96a097-fd1a-4c53-a3c4-2a3288f39e9d",
          "version": 158,
          "type": "page",
          "properties": {
            "title": [
              [
                "Simple testing ground"
              ]
            ]
          },
          "content": [
            "cfa04bab-3563-498b-9273-5a38b18f612e",
            "da588333-9327-48db-bc4b-084ab6131aad"
          ],
          "format": {
            "page_icon": "🌥️"
          },
          "permissions": [
            {
              "role": "editor",
              "type": "user_permission",
              "user_id": "a5b8452a-14a3-4719-a224-ea678b37f50c"
            },
            {
              "role": "reader",
              "type": "public_permission",
              "added_timestamp": 1655094244633
            }
          ],
          "created_time": 1655094180000,
          "last_edited_time": 1655113860000,
          "parent_id": "6af4dea3-6d07-4986-9c7e-c2b8bc430408",
          "parent_table": "space",
          "alive": true,
          "created_by_table": "notion_user",
          "created_by_id": "a5b8452a-14a3-4719-a224-ea678b37f50c",
          "last_edited_by_table": "notion_user",
          "last_edited_by_id": "a5b8452a-14a3-4719-a224-ea678b37f50c",
          "space_id": "6af4dea3-6d07-4986-9c7e-c2b8bc430408"
        }
      },
      "896ef183-f406-4750-9d10-d1fba05ce6b0": {
        "role": "reader",
        "value": {
          "id": "896ef183-f406-4750-9d10-d1fba05ce6b0",
          "version": 14,
          "type": "text",
          "properties": {
            "title": [
              [
                "asdfdasfdsf"
              ]
            ]
          },
          "created_time": 1655114400000,
          "last_edited_time": 1655114400000,
          "parent_id": "f3961580-1bd0-4fdc-a948-f16b450058d4",
          "parent_table": "block",
          "alive": true,
          "created_by_table": "notion_user",
          "created_by_id": "a5b8452a-14a3-4719-a224-ea678b37f50c",
          "last_edited_by_table": "notion_user",
          "last_edited_by_id": "a5b8452a-14a3-4719-a224-ea678b37f50c",
          "space_id": "6af4dea3-6d07-4986-9c7e-c2b8bc430408"
        }
      }
    },
    "collection": {
      "58e7440f-fad4-4a30-9de3-2dc5f5673b62": {
        "role": "reader",
        "value": {
          "id": "58e7440f-fad4-4a30-9de3-2dc5f5673b62",
          "version": 14,
          "name": [
            [
              "Database-test"
            ]
          ],
          "schema": {
            "CT[O": {
              "name": "Tags",
              "type": "multi_select"
            },
            "title": {
              "name": "Name",
              "type": "title"
            }
          },
          "format": {
            "collection_page_properties": [
              {
                "visible": true,
                "property": "CT[O"
              }
            ]
          },
          "parent_id": "da588333-9327-48db-bc4b-084ab6131aad",
          "parent_table": "block",
          "alive": true,
          "migrated": true,
          "space_id": "6af4dea3-6d07-4986-9c7e-c2b8bc430408"
        }
      }
    },
    "space": {
      "6af4dea3-6d07-4986-9c7e-c2b8bc430408": {
        "role": "none"
      }
    }
  }
}
```

What's important is

```json
  "result": {
    "type": "reducer",
    "reducerResults": {
      "collection_group_results": {
        "type": "results",
        "blockIds": [
          "73c7256e-f1b5-4fab-abc9-77536951ba33",
          "f3961580-1bd0-4fdc-a948-f16b450058d4",
          "11c93ec1-465d-4e4d-b331-419887cee722"
        ],
        "hasMore": false
      }
    },
    "sizeHint": 3
  },
```

this part, where `blockIds` is actual children pages of database, and `sizeHint` is the number of the children.

## Some relevant stuffs
- https://observablehq.com/@zakjan/force-directed-graph-pixi
- https://github.com/vasturiano/3d-force-graph
- https://github.com/indradb/indradb